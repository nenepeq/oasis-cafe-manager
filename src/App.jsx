import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getProducts } from './api';
import { 
  Coffee, Snowflake, CupSoda, Utensils, ShoppingCart, Trash2, 
  LogOut, List, IceCream, FileText, CheckCircle, Clock, TrendingUp, RefreshCw, User, 
  CreditCard, Banknote, Calendar, RotateCcw, X, Package, Truck, AlertTriangle, DollarSign, Eye, PieChart, Receipt, ArrowDown, ArrowUp, Activity
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
  const [inventoryList, setInventoryList] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
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

  // === ESTADOS PARA FINANZAS AVANZADAS ===
  const [financeDate, setFinanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [finData, setFinData] = useState({
    ingresos: 0,
    gastosOps: 0,
    gastosStock: 0,
    totalGastos: 0,
    utilidadNeta: 0,
    margen: 0
  });
  const [dailyExpensesList, setDailyExpensesList] = useState([]); // Lista detallada de gastos operativos
  const [dailyStockList, setDailyStockList] = useState([]); // Lista detallada de compras stock

  // Estados para Gastos Operativos (Formulario)
  const [expenseConcepto, setExpenseConcepto] = useState('');
  const [expenseCategoria, setExpenseCategoria] = useState('Insumos');
  const [expenseMonto, setExpenseMonto] = useState(0);

  const categories = [
    'Todos', 'Bebidas Calientes', 'Alimentos', 'Frappés', 
    'Bebidas Frías', 'Refrescos', 'Postres', 'Sabritas y Otros'
  ];

  const expenseCategories = [
    'Insumos', 'Café molido', 'Vegetales', 'Lácteos', 'Embutidos', 'Pan',
    'Suministros', 'Servilletas', 'Vasos desechables', 'Popotes', 'Crema batida', 'Azúcar',
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

  // Actualizar reportes al cambiar fecha
  useEffect(() => { if (showReport && user) fetchSales(); }, [showReport, reportDate]);
  
  // Actualizar finanzas al cambiar fecha
  useEffect(() => { if (showFinances && user) calculateFinances(); }, [showFinances, financeDate]);

  // --- LÓGICA DE REPORTES (SOLO LISTADO) ---
  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select(`*, sale_items (*, products (name, sale_price))`)
      .gte('created_at', reportDate + 'T00:00:00')
      .lte('created_at', reportDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    setSales(data || []);
    // Sumar solo ventas NO canceladas
    const total = data?.reduce((acc, sale) => sale.status !== 'cancelado' ? acc + (sale.total || 0) : acc, 0) || 0;
    setTotalIngresosReporte(total);
    setLoading(false);
  };

  // --- LÓGICA MAESTRA DE FINANZAS (CÁLCULO REAL) ---
  const calculateFinances = async () => {
    setLoading(true);
    
    // 1. Obtener VENTAS del día (Solo activas)
    const { data: salesData } = await supabase
      .from('sales')
      .select('total, status')
      .gte('created_at', financeDate + 'T00:00:00')
      .lte('created_at', financeDate + 'T23:59:59')
      .neq('status', 'cancelado'); // Importante: Ignorar cancelados en la base
    
    const totalIngresos = salesData?.reduce((acc, s) => acc + s.total, 0) || 0;

    // 2. Obtener GASTOS OPERATIVOS del día
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .eq('fecha', financeDate)
      .order('created_at', { ascending: false });
    
    const totalGastosOps = expensesData?.reduce((acc, e) => acc + e.monto, 0) || 0;
    setDailyExpensesList(expensesData || []);

    // 3. Obtener COMPRAS DE STOCK (Entradas) del día
    const { data: purchasesData } = await supabase
      .from('purchases')
      .select(`*, purchase_items(*, products(name))`)
      .gte('created_at', financeDate + 'T00:00:00')
      .lte('created_at', financeDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    const totalGastosStock = purchasesData?.reduce((acc, p) => acc + p.total, 0) || 0;
    setDailyStockList(purchasesData || []);

    // 4. Calcular Totales Finales
    const totalGastos = totalGastosOps + totalGastosStock;
    const utilidad = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

    setFinData({
      ingresos: totalIngresos,
      gastosOps: totalGastosOps,
      gastosStock: totalGastosStock,
      totalGastos: totalGastos,
      utilidadNeta: utilidad,
      margen: margen
    });

    setLoading(false);
  };

  // --- LÓGICA DE CANCELACIÓN Y DEVOLUCIÓN DE STOCK ---
  const updateSaleStatus = async (saleId, newStatus) => {
    if (selectedSale && selectedSale.status === 'cancelado' && newStatus === 'cancelado') {
      alert("Esta venta ya está cancelada.");
      return;
    }
    setLoading(true);
    try {
      if (newStatus === 'cancelado') {
        // 1. Obtener items para devolver
        const { data: itemsToReturn, error: itemsError } = await supabase
          .from('sale_items')
          .select('product_id, quantity')
          .eq('sale_id', saleId);

        if (itemsError) throw itemsError;

        // 2. Devolver al inventario (Bucle)
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

      // 3. Actualizar estado de la venta
      const { error } = await supabase.from('sales').update({ status: newStatus }).eq('id', saleId);
      
      if (error) throw new Error(error.message);
      else {
        alert(`✅ Venta actualizada a: ${newStatus.toUpperCase()}`);
        await fetchSales();    // Refrescar reporte ventas
        await calculateFinances(); // Refrescar finanzas (si está abierto o en caché)
        await fetchInventory(); // Refrescar inventario visual
        setSelectedSale(null); 
      }
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory').select('stock, product_id, products:product_id (name)');
    if (error) console.error(error);
    else setInventoryList(data || []);
  };

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
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? {...i, quantity: i.quantity + 1} : i);
      return [...prev, {...product, quantity: 1}];
    });
  };

  const handleSale = async () => {
    if (cart.length === 0) return;
    if (loading) return;
    const confirmPay = window.confirm(`✅ CONFIRMAR VENTA ✅\n\nMétodo: ${paymentMethod.toUpperCase()}\n\n⚠️ AVISO IMPORTANTE ⚠️\n\nRecuerda que si es pago con 💳 TARJETA, procede a realizar el cobro en la terminal bancaria.`);
    if (!confirmPay) return;
    setLoading(true);
    try {
      const totalVenta = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);
      const { data: sale, error: saleError } = await supabase.from('sales').insert([{ total: totalVenta, status: "recibido", created_by: user.id, customer_name: customerName.trim() || 'Sin nombre', payment_method: paymentMethod }]).select().single();
      if (saleError) throw saleError;
      const itemsToInsert = cart.map(item => ({ sale_id: sale.id, product_id: item.id, quantity: item.quantity, price: item.sale_price }));
      await supabase.from('sale_items').insert(itemsToInsert);
      
      // Descontar stock al vender (opcional si lo manejas por triggers, pero aquí lo hacemos manual por seguridad en frontend básico)
      for (const item of cart) {
         const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
         if(currentInvItem) {
             const newStock = currentInvItem.stock - item.quantity;
             await supabase.from('inventory').update({stock: newStock}).eq('product_id', item.id);
         }
      }

      alert("✅ Venta Registrada");
      setCart([]); setCustomerName('');
      fetchInventory(); // Actualizar stock visual
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleRegisterPurchase = async () => {
    if (purchaseCart.length === 0) return;
    if (loading) return;
    setLoading(true);
    try {
      const totalCompra = purchaseCart.reduce((acc, i) => acc + (i.cost * i.qty), 0);
      const { data: purchase, error: pErr } = await supabase.from('purchases').insert([{ total: totalCompra, created_by: user.id }]).select().single();
      if (pErr) throw pErr;
      for (const item of purchaseCart) {
        const { error: itemError } = await supabase.from('purchase_items').insert([{ purchase_id: purchase.id, product_id: item.id, quantity: item.qty, cost: item.cost }]);
        if (itemError) throw itemError;
        
        // Sumar al stock
        const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
        if(currentInvItem) {
             const newStock = currentInvItem.stock + item.qty;
             await supabase.from('inventory').update({stock: newStock}).eq('product_id', item.id);
        }
      }
      alert("📦 Stock Actualizado");
      setPurchaseCart([]); setSelectedPurchaseProd(''); setPurchaseQty(0); setPurchaseCost(0);
      setTimeout(() => fetchInventory(), 500);
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  };

  const handleRegisterExpense = async () => {
    if (!expenseConcepto.trim() || expenseMonto <= 0) { alert('Por favor completa todos los campos correctamente'); return; }
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert([{ concepto: expenseConcepto.trim(), categoria: expenseCategoria, monto: expenseMonto, fecha: new Date().toISOString().split('T')[0], created_by: user.id }]);
      if (error) throw error;
      alert("💰 Gasto Registrado Exitosamente");
      setExpenseConcepto(''); setExpenseCategoria('Insumos'); setExpenseMonto(0);
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  };

  const handleNewOrder = () => {
    if (window.confirm("¿Iniciar pedido nuevo?")) { setCart([]); setCustomerName(''); setPaymentMethod('Efectivo'); }
  };

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => (p.category || '').trim() === selectedCategory);

  if (!user) return <Login onLogin={fetchProfile} />;

  // --- PREPARAR GRÁFICA DE PASTEL CSS ---
  // Calculamos el porcentaje que representan los gastos sobre los ingresos
  // Si gastos > ingresos, la barra se llena al 100% de rojo.
  const percentageExpenses = finData.ingresos > 0 
    ? Math.min((finData.totalGastos / finData.ingresos) * 100, 100) 
    : (finData.totalGastos > 0 ? 100 : 0);
  
  const percentageProfit = 100 - percentageExpenses;

  // CSS Conic Gradient para la gráfica
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

  // Círculo interior blanco para hacer el efecto Donut
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

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8f6f2', overflow: 'hidden' }}>
      
      {/* 1. SECCIÓN DE TIENDA */}
      <div className="store-section" style={{ flex: 2, padding: '15px', display: 'flex', flexDirection: 'column' }}>
        
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Oasis" style={{ height: '35px' }} />
            <h1 style={{ color: '#4a3728', margin: 0, fontSize: '20px', fontWeight: '900' }}>Oasis Café</h1>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {userRole === 'admin' && (
              <button onClick={() => setShowInventory(true)} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><Package size={16}/></button>
            )}
            <button onClick={() => setShowReport(true)} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><FileText size={16}/></button>
            {userRole === 'admin' && (
              <button onClick={() => setShowFinances(true)} style={{ background: '#9b59b6', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><PieChart size={16}/></button>
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

        {/* GRID PRODUCTOS */}
        {!fetchError && filteredProducts.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888', marginTop: '10px' }}><p style={{ fontWeight: 'bold', fontSize: '18px' }}>⚠️ No hay productos</p></div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '8px' }}>
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} style={{ padding: '8px', borderRadius: '12px', border: 'none', backgroundColor: '#fff', textAlign: 'center', height: '130px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ marginBottom: '5px' }}>{getCategoryIcon(p)}</div>
                <div style={{ fontWeight: 'bold', color: '#4a3728', fontSize: '12px', lineHeight: '1.2', marginBottom: '4px' }}>{p.name}</div>
                <div style={{ color: '#27ae60', fontWeight: '900', fontSize: '13px' }}>${p.sale_price}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'none' }}></div>
      </div>

      {/* 2. CARRITO */}
      <div className="cart-section" style={{ flex: 0.8, backgroundColor: '#ffffff', padding: '15px', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#4a3728', fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={20} /> Pedido</h2>
        <input type="text" placeholder="Cliente..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#3498db', color: '#FFF', fontWeight: '900', fontSize: '14px' }} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' }}>
              <div style={{ color: '#4a3728', fontWeight: '800' }}>{item.name} x{item.quantity}</div>
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
        <div style={{ fontSize: '24px', fontWeight: '900', color: '#4a3728', textAlign: 'right', marginTop: '10px' }}>Total: ${cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0)}</div>
        <button onClick={handleSale} disabled={loading} style={{ width: '100%', padding: '15px', backgroundColor: loading ? '#999' : '#4a3728', color: '#fff', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px', fontSize: '14px' }}>{loading ? 'PROCESANDO...' : 'COBRAR'}</button>
        <button onClick={handleNewOrder} style={{ width: '100%', padding: '10px', backgroundColor: '#ff4d4d', color: '#fff', borderRadius: '12px', fontWeight: '900', marginTop: '5px', border: 'none', cursor: 'pointer', fontSize: '12px' }}><RotateCcw size={14}/> NUEVO</button>
      </div>

      {/* MODAL INVENTARIO */}
      {showInventory && userRole === 'admin' && (
        <div onClick={() => setShowInventory(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowInventory(false)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={24}/></button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '40px' }}>
              <h2 style={{ color: '#000000', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}><Package size={24}/> Stock</h2>
              <button onClick={fetchInventory} disabled={loading} style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer' }}><RefreshCw size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>Existencias</h3>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '15px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead style={{ background: '#f8f6f2' }}><tr><th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Prod</th><th style={{ padding: '10px', color: '#000' }}>Cant</th><th style={{ padding: '10px', color: '#000' }}>!</th></tr></thead>
                    <tbody>
                      {inventoryList.map((inv, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px', color: '#000', fontWeight: '600' }}>{inv.products?.name}</td><td style={{ padding: '10px', textAlign: 'center', fontWeight: '900', color: '#000' }}>{inv.stock}</td><td style={{ padding: '10px', textAlign: 'center' }}>{inv.stock <= 5 ? <AlertTriangle color="#e74c3c" size={16}/> : <CheckCircle color="#27ae60" size={16}/>}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ background: '#fdfbf9', padding: '20px', borderRadius: '15px', border: '1px solid #f1ece6' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>Entrada Stock</h3>
                <select value={selectedPurchaseProd} onChange={(e) => setSelectedPurchaseProd(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}>
                  <option value="">Seleccionar...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input type="number" placeholder="Cant." value={purchaseQty || ''} onChange={(e) => setPurchaseQty(parseInt(e.target.value) || 0)} style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }} />
                  <input type="number" placeholder="$ Costo" value={purchaseCost || ''} onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }} />
                </div>
                <button onClick={() => { 
                  const p = products.find(x => x.id === selectedPurchaseProd); 
                  if (p && purchaseQty > 0 && purchaseCost > 0) {
                    setPurchaseCart([...purchaseCart, { ...p, qty: purchaseQty, cost: purchaseCost }]);
                    setSelectedPurchaseProd(''); setPurchaseQty(0); setPurchaseCost(0);
                  } else { alert('Complete campos'); }
                }} style={{ width: '100%', padding: '10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>+ AÑADIR</button>
                <div style={{ marginTop: '15px', color: '#000' }}>
                  {purchaseCart.map((item, i) => (
                    <div key={i} style={{ fontSize: '12px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}><span>📦 {item.name} x{item.qty}</span><span style={{ fontWeight: '900' }}>${(item.qty * item.cost).toFixed(2)}</span></div>
                  ))}
                  {purchaseCart.length > 0 && (
                     <button onClick={handleRegisterPurchase} disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#999' : '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', marginTop: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>GUARDAR COMPRA</button>
                  )}
                </div>
              </div>
            </div>
             <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '15px', border: '2px solid #ff9800', marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '10px' }}>Gastos Operativos</h3>
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

      {/* MODAL REPORTES */}
      {showReport && (
        <div onClick={() => { setShowReport(false); setSelectedSale(null); }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '20px', borderRadius: '20px', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowReport(false); setSelectedSale(null); }} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={24}/></button>
            <h2 style={{ color: '#000000', fontWeight: '900', margin: '0 0 15px 0', fontSize: '20px' }}>Reporte Ventas</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }} />
              <div style={{ marginLeft: 'auto', fontWeight: '900', fontSize: '18px', color: '#27ae60' }}>${totalIngresosReporte.toFixed(2)}</div>
            </div>
             <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '20px' }}>
              <div style={{ flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ borderBottom: '2px solid #000' }}><th style={{ textAlign: 'left', padding: '8px', color: '#000' }}>Hora</th><th style={{ textAlign: 'left', padding: '8px', color: '#000' }}>Cliente</th><th style={{ textAlign: 'right', padding: '8px', color: '#000' }}>Total</th></tr></thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} onClick={() => setSelectedSale(sale)} style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: selectedSale?.id === sale.id ? '#f0f8ff' : 'transparent' }}>
                        <td style={{ padding: '10px', color: '#000' }}>{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td style={{ padding: '10px', color: '#000' }}>{sale.customer_name}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: sale.status === 'cancelado' ? '#ccc' : '#27ae60', fontWeight: '900' }}>${sale.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedSale && (
                <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                  <h3 style={{ marginTop: 0, color: '#000', fontSize: '16px' }}>Nota #{selectedSale.id.slice(0,4)}</h3>
                  <div style={{ marginBottom: '10px', color: '#000', fontSize: '13px' }}>
                    {selectedSale.sale_items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>{item.products?.name} x{item.quantity}</span><span style={{ fontWeight: 'bold' }}>${item.price * item.quantity}</span></div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '16px', color: '#000' }}><span>Total</span><span>${selectedSale.total}</span></div>
                  <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {selectedSale.status === 'recibido' && <button onClick={() => updateSaleStatus(selectedSale.id, 'entregado')} style={{ padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>MARCAR ENTREGADO</button>}
                     {userRole === 'admin' && selectedSale.status !== 'cancelado' && <button onClick={() => updateSaleStatus(selectedSale.id, 'cancelado')} style={{ padding: '10px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>CANCELAR</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINANZAS AVANZADO (DASHBOARD) */}
      {showFinances && userRole === 'admin' && (
        <div onClick={() => setShowFinances(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowFinances(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={30}/></button>
            
            {/* ENCABEZADO FINANZAS */}
            <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ color: '#000', fontWeight: '900', margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PieChart size={28}/> Dashboard Financiero
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="date" value={financeDate} onChange={(e) => setFinanceDate(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold' }} />
                <button onClick={calculateFinances} disabled={loading} style={{ padding: '10px 20px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}><RefreshCw size={20}/></button>
              </div>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '50px', color: '#999', fontSize: '18px' }}>Analizando datos...</div> : (
              <>
                {/* 1. TARJETAS DE KPIS PRINCIPALES */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                   {/* CARD INGRESOS */}
                   <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', marginBottom: '5px' }}>
                        <TrendingUp size={20}/> <span style={{ fontWeight: 'bold' }}>Ingresos</span>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#15803d' }}>${finData.ingresos.toFixed(2)}</div>
                   </div>
                   {/* CARD GASTOS */}
                   <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', marginBottom: '5px' }}>
                        <ArrowDown size={20}/> <span style={{ fontWeight: 'bold' }}>Gastos Totales</span>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>${finData.totalGastos.toFixed(2)}</div>
                      <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '5px' }}>Ops: ${finData.gastosOps} | Stock: ${finData.gastosStock}</div>
                   </div>
                   {/* CARD UTILIDAD */}
                   <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '20px', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b21a8', marginBottom: '5px' }}>
                        <DollarSign size={20}/> <span style={{ fontWeight: 'bold' }}>Utilidad Neta</span>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#7e22ce' }}>${finData.utilidadNeta.toFixed(2)}</div>
                      <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '5px' }}>Margen Real: {finData.margen.toFixed(1)}%</div>
                   </div>
                </div>

                {/* 2. GRÁFICOS VISUALES */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginBottom: '30px' }}>
                  
                  {/* GRÁFICA DE PASTEL (DONUT) */}
                  <div style={{ flex: 1, minWidth: '300px', background: '#fff', border: '1px solid #eee', borderRadius: '25px', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#666' }}>Distribución de Flujo</h3>
                     
                     <div style={donutStyle}>
                        <div style={innerCircleStyle}>
                           <span style={{ fontSize: '20px', fontWeight: '900', color: '#000' }}>{percentageProfit > 0 ? percentageProfit.toFixed(0) : 0}%</span>
                           <span style={{ fontSize: '10px', color: '#888' }}>Rentabilidad</span>
                        </div>
                     </div>

                     <div style={{ marginTop: '20px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', background: '#27ae60', borderRadius: '50%' }}></div> Ganancia</span>
                           <span style={{ fontWeight: 'bold' }}>${finData.utilidadNeta.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', background: '#e74c3c', borderRadius: '50%' }}></div> Gastos</span>
                           <span style={{ fontWeight: 'bold' }}>${finData.totalGastos.toFixed(2)}</span>
                        </div>
                     </div>
                  </div>

                  {/* BARRAS DE RENTABILIDAD */}
                  <div style={{ flex: 1.5, minWidth: '300px', background: '#fff', border: '1px solid #eee', borderRadius: '25px', padding: '25px' }}>
                     <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#666' }}>Análisis de Rentabilidad</h3>
                     
                     <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                           <span>Ingresos Totales</span>
                           <span>100%</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                           <div style={{ width: '100%', height: '100%', background: '#3498db' }}></div>
                        </div>
                     </div>

                     <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                           <span>Gastos Operativos & Stock</span>
                           <span>{percentageExpenses.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                           <div style={{ width: `${percentageExpenses}%`, height: '100%', background: '#e74c3c' }}></div>
                        </div>
                     </div>

                     <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                           <span>Margen Neto (Bolsa)</span>
                           <span>{finData.margen.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                           <div style={{ width: `${finData.margen > 0 ? finData.margen : 0}%`, height: '100%', background: '#27ae60' }}></div>
                        </div>
                     </div>
                  </div>
                </div>

                {/* 3. TABLAS DETALLADAS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  {/* Tabla Gastos Operativos */}
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #ff9800', paddingBottom: '10px' }}>Gastos Operativos</h3>
                    {dailyExpensesList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>Sin gastos operativos hoy.</p> : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          {dailyExpensesList.map((exp) => (
                            <tr key={exp.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '8px 0', color: '#555' }}>{exp.concepto} <span style={{ fontSize: '10px', color: '#999' }}>({exp.categoria})</span></td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c' }}>-${exp.monto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Tabla Compras Stock */}
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>Entradas de Stock (Inversión)</h3>
                    {dailyStockList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>No se compró stock hoy.</p> : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          {dailyStockList.map((purch) => (
                            <tr key={purch.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '8px 0', color: '#555' }}>
                                Compra #{purch.id.toString().slice(0,4)} 
                                <div style={{ fontSize: '10px', color: '#888' }}>
                                  {purch.purchase_items?.map(i => `${i.products?.name} x${i.quantity}`).join(', ')}
                                </div>
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c' }}>-${purch.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;