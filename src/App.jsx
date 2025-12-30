import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getProducts } from './api';
import { 
  Coffee, Snowflake, CupSoda, Utensils, ShoppingCart, Trash2, 
  LogOut, List, IceCream, FileText, CheckCircle, Clock, TrendingUp, RefreshCw, User, 
  CreditCard, Banknote, Calendar, RotateCcw, X, Package, Truck, AlertTriangle, DollarSign, Eye, PieChart, Receipt
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
  const [fetchError, setFetchError] = useState(null); // Nuevo estado para errores
  const [cart, setCart] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showFinances, setShowFinances] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Estados para Reportes
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [totalIngresos, setTotalIngresos] = useState(0);

  // Estados para Compras
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [selectedPurchaseProd, setSelectedPurchaseProd] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(0);
  const [purchaseCost, setPurchaseCost] = useState(0);

  // Estados para Finanzas
  const [financeDate, setFinanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyProfit, setDailyProfit] = useState(null);
  const [dailyUtility, setDailyUtility] = useState(null);
  const [dailyExpenses, setDailyExpenses] = useState([]);

  // Estados para Gastos Operativos
  const [expenseConcepto, setExpenseConcepto] = useState('');
  const [expenseCategoria, setExpenseCategoria] = useState('Insumos');
  const [expenseMonto, setExpenseMonto] = useState(0);

  const expenseCategories = [
    'Insumos',
    'Café molido',
    'Vegetales',
    'Lácteos',
    'Embutidos',
    'Pan',
    'Suministros',
    'Servilletas',
    'Vasos desechables',
    'Popotes',
    'Crema batida',
    'Azúcar',
    'Sueldos',
    'Servicios',
    'Otros'
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

  // --- MODIFICADO: CARGA DE PRODUCTOS CON MANEJO DE ERRORES VISIBLE ---
  useEffect(() => {
    if (user) {
      getProducts().then(res => {
        if (res.error) {
          console.error("Error cargando productos:", res.error);
          setFetchError(res.error.message); // Guardamos el mensaje de error
        } else {
          setProducts(res.data || []);
          setFetchError(null);
        }
      });
      fetchInventory();
    }
  }, [user]);

  useEffect(() => {
    if (showReport && user) {
      fetchSales();
    }
  }, [showReport, reportDate]);

  useEffect(() => {
    if (showFinances && user) {
      fetchFinances();
    }
  }, [showFinances, financeDate]);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (name, sale_price)
        )
      `)
      .gte('created_at', reportDate + 'T00:00:00')
      .lte('created_at', reportDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setSales(data || []);
    
    const total = data?.reduce((acc, sale) => {
      return sale.status !== 'cancelado' ? acc + (sale.total || 0) : acc;
    }, 0) || 0;

    setTotalIngresos(total);
    setLoading(false);
  };

  const fetchFinances = async () => {
    setLoading(true);
    
    const { data: profitData } = await supabase
      .from('daily_profit')
      .select('*')
      .eq('fecha', financeDate)
      .single();

    const { data: utilityData } = await supabase
      .from('daily_utility')
      .select('*')
      .eq('fecha', financeDate)
      .single();

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .eq('fecha', financeDate)
      .order('created_at', { ascending: false });

    setDailyProfit(profitData);
    setDailyUtility(utilityData);
    setDailyExpenses(expensesData || []);
    setLoading(false);
  };

  const updateSaleStatus = async (saleId, newStatus) => {
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

      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('id', saleId);

      if (error) {
        throw new Error(error.message);
      } else {
        alert(`✅ Venta actualizada a: ${newStatus.toUpperCase()}`);
        await fetchSales(); 
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
    
    const confirmPay = window.confirm(`✅ CONFIRMAR VENTA ✅\n\nMétodo: ${paymentMethod.toUpperCase()}\n\n⚠️ AVISO IMPORTANTE ⚠️\n\nRecuerda que si es pago con 💳 TARJETA, procede a realizar el cobro en la terminal bancaria, de otra forma, recibe el pago en 💴 EFECTIO y entrega cambio si procede.\n\nPresiona aceptar para registrar la venta.`);
    if (!confirmPay) return;
    
    setLoading(true);
    try {
      const totalVenta = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);
      const { data: sale, error: saleError } = await supabase.from('sales').insert([{ total: totalVenta, status: "recibido", created_by: user.id, customer_name: customerName.trim() || 'Sin nombre', payment_method: paymentMethod }]).select().single();
      if (saleError) throw saleError;
      const itemsToInsert = cart.map(item => ({ sale_id: sale.id, product_id: item.id, quantity: item.quantity, price: item.sale_price }));
      await supabase.from('sale_items').insert(itemsToInsert);
      alert("✅ Venta Registrada");
      setCart([]); setCustomerName('');
    } catch (err) { alert(err.message); }
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
      }
      
      alert("📦 Stock Actualizado");
      setPurchaseCart([]);
      setSelectedPurchaseProd('');
      setPurchaseQty(0);
      setPurchaseCost(0);
      
      setTimeout(() => {
        fetchInventory();
      }, 500);
      
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
    if (window.confirm("¿Iniciar pedido nuevo?")) { setCart([]); setCustomerName(''); setPaymentMethod('Efectivo'); }
  };

  if (!user) return <Login onLogin={fetchProfile} />;

  // --------------------------------------------------------------------------------
  // CÁLCULOS FINANCIEROS
  // --------------------------------------------------------------------------------
  
  const totalGastosOperativos = dailyExpenses.reduce((acc, exp) => acc + (parseFloat(exp.monto) || 0), 0);
  const totalGastosReales = (dailyUtility?.costo_total_productos || 0) + totalGastosOperativos;
  const utilidadNetaReal = (dailyProfit?.ingresos || 0) - totalGastosReales;

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8f6f2', overflow: 'hidden' }}>
      
      {/* 1. SECCIÓN DE TIENDA (IZQUIERDA) */}
      <div className="store-section" style={{ flex: 2, padding: '25px', display: 'flex', flexDirection: 'column' }}>
        
        {/* ENCABEZADO / MENÚ SUPERIOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo.png" alt="Oasis" style={{ height: '50px' }} />
            <h1 style={{ color: '#4a3728', margin: 0, fontSize: '28px', fontWeight: '900' }}>Oasis Café</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {userRole === 'admin' && (
              <button onClick={() => setShowInventory(true)} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>
                <Package size={18}/> INVENTARIO
              </button>
            )}
            
            <button onClick={() => setShowReport(true)} style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}><FileText size={18}/> REPORTES</button>
            
            {userRole === 'admin' && (
              <button onClick={() => setShowFinances(true)} style={{ background: '#9b59b6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>
                <PieChart size={18}/> FINANZAS
              </button>
            )}
            
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} style={{ backgroundColor: '#ffffff', color: '#e74c3c', border: '2px solid #e74c3c', padding: '12px 24px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={18} /> 
              <span style={{ textTransform: 'uppercase' }}>{userRole === 'admin' ? 'ADMIN' : 'VENTAS'}</span>
            </button>
          </div>
        </div>

        {/* CONTENEDOR DE PRODUCTOS (MODIFICADO CON FLEX Y MENSAJE DE DEBUG) */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '10px' }}>
          
          {/* AVISO DE ERROR DE CONEXIÓN */}
          {fetchError && (
             <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px', marginBottom: '20px', border: '2px solid #fecaca' }}>
                <p style={{ fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <AlertTriangle size={24}/> Error de Conexión
                </p>
                <p style={{ fontSize: '14px' }}>Supabase dice: <strong>{fetchError}</strong></p>
                <p style={{ fontSize: '12px', marginTop: '5px' }}>Posible solución: Ve a Supabase {'>'} SQL Editor y ejecuta los comandos para desactivar RLS o crear políticas públicas.</p>
             </div>
          )}

          {/* MENSAJE DE LISTA VACÍA */}
          {!fetchError && products.length === 0 && (
             <div style={{ padding: '20px', textAlign: 'center', color: '#888', marginTop: '20px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '18px' }}>⚠️ No se encontraron productos</p>
                <p style={{ fontSize: '14px' }}>Si estás en Vercel, asegúrate de haber hecho REDEPLOY después de agregar las variables.</p>
             </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} style={{ padding: '10px', borderRadius: '15px', border: 'none', backgroundColor: '#fff', textAlign: 'center', height: '140px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ marginBottom: '5px' }}>{getCategoryIcon(p)}</div>
                <div style={{ fontWeight: 'bold', color: '#4a3728', fontSize: '13px', lineHeight: '1.2', marginBottom: '5px' }}>{p.name}</div>
                <div style={{ color: '#27ae60', fontWeight: '900', fontSize: '14px' }}>${p.sale_price}</div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 2. SECCIÓN DEL CARRITO (DERECHA) */}
      <div className="cart-section" style={{ flex: 0.8, backgroundColor: '#ffffff', padding: '25px', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#4a3728', fontSize: '22px', fontWeight: '900' }}><ShoppingCart size={24} /> Pedido</h2>
        <input type="text" placeholder="Cliente..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '12px', border: 'none', backgroundColor: '#3498db', color: '#FFF', fontWeight: '900' }} />
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ color: '#4a3728', fontWeight: '800' }}>{item.name} x{item.quantity}</div>
              <div style={{ color: '#27ae60', fontWeight: '900' }}>${item.sale_price * item.quantity}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '900', color: '#4a3728' }}>MÉTODO DE PAGO:</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button onClick={() => setPaymentMethod('Efectivo')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: paymentMethod === 'Efectivo' ? '3px solid #27ae60' : '1px solid #ddd', backgroundColor: paymentMethod === 'Efectivo' ? '#27ae60' : '#999', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}> EFECTIVO </button>
            <button onClick={() => setPaymentMethod('Tarjeta')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: paymentMethod === 'Tarjeta' ? '3px solid #3498db' : '1px solid #ddd', backgroundColor: paymentMethod === 'Tarjeta' ? '#3498db' : '#999', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}> TARJETA </button>
          </div>
        </div>

        <div style={{ fontSize: '32px', fontWeight: '900', color: '#4a3728', textAlign: 'right', marginTop: '15px' }}>Total: ${cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0)}</div>
        <button onClick={handleSale} disabled={loading} style={{ width: '100%', padding: '18px', backgroundColor: loading ? '#999' : '#4a3728', color: '#fff', borderRadius: '15px', fontWeight: '900', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
          {loading ? 'PROCESANDO...' : 'FINALIZAR COBRO'}
        </button>
        <button onClick={handleNewOrder} style={{ width: '100%', padding: '12px', backgroundColor: '#ff4d4d', color: '#fff', borderRadius: '15px', fontWeight: '900', marginTop: '10px', border: 'none', cursor: 'pointer' }}><RotateCcw size={16}/> PEDIDO NUEVO</button>
      </div>

      {/* MODAL GESTIÓN DE STOCK */}
      {showInventory && userRole === 'admin' && (
        <div onClick={() => setShowInventory(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '40px', borderRadius: '30px', width: '950px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowInventory(false)} style={{ position: 'absolute', top: '25px', right: '25px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={30}/></button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingRight: '50px' }}>
              <h2 style={{ color: '#000000', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={28}/> Gestión de Stock y Gastos
              </h2>
              <button onClick={fetchInventory} disabled={loading} style={{ padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} /> ACTUALIZAR
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>Existencias Actuales</h3>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '20px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8f6f2' }}>
                      <tr><th style={{ padding: '15px', textAlign: 'left', color: '#000000' }}>Producto</th><th style={{ padding: '15px', color: '#000000' }}>Stock</th><th style={{ padding: '15px', color: '#000000' }}>Estado</th></tr>
                    </thead>
                    <tbody>
                      {inventoryList.map((inv, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px', color: '#000000', fontWeight: '600' }}>{inv.products?.name}</td>
                          <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', color: '#000000' }}>{inv.stock}</td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>{inv.stock <= 5 ? <AlertTriangle color="#e74c3c" size={18}/> : <CheckCircle color="#27ae60" size={18}/>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ background: '#fdfbf9', padding: '25px', borderRadius: '25px', border: '1px solid #f1ece6' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}><Truck size={20}/> Compra de Inventario</h3>
                <select value={selectedPurchaseProd} onChange={(e) => setSelectedPurchaseProd(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', marginBottom: '10px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ddd', fontWeight: 'bold' }}>
                  <option value="">Seleccionar...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input type="number" placeholder="Cant." value={purchaseQty || ''} onChange={(e) => setPurchaseQty(parseInt(e.target.value) || 0)} style={{ flex: 1, padding: '15px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ddd', fontWeight: 'bold' }} />
                  <input type="number" placeholder="$ Costo" value={purchaseCost || ''} onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: '15px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ddd', fontWeight: 'bold' }} />
                </div>
                <button onClick={() => { 
                  const p = products.find(x => x.id === selectedPurchaseProd); 
                  if (p && purchaseQty > 0 && purchaseCost > 0) {
                    setPurchaseCart([...purchaseCart, { ...p, qty: purchaseQty, cost: purchaseCost }]);
                    setSelectedPurchaseProd('');
                    setPurchaseQty(0);
                    setPurchaseCost(0);
                  } else {
                    alert('Complete todos los campos correctamente');
                  }
                }} style={{ width: '100%', padding: '15px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>+ AÑADIR</button>
                
                <div style={{ marginTop: '20px', color: '#000000' }}>
                  {purchaseCart.map((item, i) => (
                    <div key={i} style={{ fontSize: '12px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>📦 {item.name} x{item.qty}</span>
                      <span style={{ fontWeight: '900' }}>${(item.qty * item.cost).toFixed(2)}</span>
                    </div>
                  ))}
                  {purchaseCart.length > 0 && (
                    <>
                      <div style={{ borderTop: '2px solid #000', marginTop: '10px', paddingTop: '10px', fontWeight: '900', fontSize: '14px' }}>
                        TOTAL: ${purchaseCart.reduce((acc, i) => acc + (i.qty * i.cost), 0).toFixed(2)}
                      </div>
                      <button 
                        onClick={handleRegisterPurchase} 
                        disabled={loading}
                        style={{ width: '100%', padding: '15px', background: loading ? '#999' : '#27ae60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', marginTop: '15px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'PROCESANDO...' : 'FINALIZAR COMPRA'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN GASTOS OPERATIVOS */}
            <div style={{ background: '#fff3e0', padding: '25px', borderRadius: '25px', border: '2px solid #ff9800' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#000000', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={24} color="#ff9800"/> Registrar Gasto Operativo
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#000000', display: 'block', marginBottom: '5px' }}>Categoría:</label>
                  <select value={expenseCategoria} onChange={(e) => setExpenseCategoria(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ddd', fontWeight: 'bold' }}>
                    {expenseCategories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#000000', display: 'block', marginBottom: '5px' }}>Monto:</label>
                  <input 
                    type="number" 
                    placeholder="$ 0.00" 
                    value={expenseMonto || ''} 
                    onChange={(e) => setExpenseMonto(parseFloat(e.target.value) || 0)} 
                    style={{ width: '100%', padding: '15px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ddd', fontWeight: 'bold' }} 
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#000000', display: 'block', marginBottom: '5px' }}>Concepto / Descripción:</label>
                <input 
                  type="text" 
                  placeholder="Ej: Compra de café molido 2kg" 
                  value={expenseConcepto} 
                  onChange={(e) => setExpenseConcepto(e.target.value)} 
                  style={{ width: '100%', padding: '15px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ddd', fontWeight: 'bold' }} 
                />
              </div>

              <button 
                onClick={handleRegisterExpense} 
                disabled={loading}
                style={{ width: '100%', padding: '15px', background: loading ? '#999' : '#ff9800', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', marginTop: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px' }}>
                {loading ? 'PROCESANDO...' : '💰 REGISTRAR GASTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTES */}
      {showReport && (
        <div onClick={() => { setShowReport(false); setSelectedSale(null); }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '40px', borderRadius: '30px', width: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowReport(false); setSelectedSale(null); }} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}><X size={30}/></button>
            <h2 style={{ color: '#000000', fontWeight: '900', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={28}/> Reporte de Ventas</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
              <Calendar size={18} color="#4a3728" />
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '14px' }} />
              <div style={{ marginLeft: 'auto', fontWeight: '900', fontSize: '20px', color: '#27ae60' }}>Total: ${totalIngresos.toFixed(2)}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#000' }}>Hora</th>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#000' }}>Cliente</th>
                      <th style={{ textAlign: 'right', padding: '10px', color: '#000' }}>Total</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: '#000' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} onClick={() => setSelectedSale(sale)} style={{ borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: selectedSale?.id === sale.id ? '#f0f8ff' : 'transparent' }}>
                        <td style={{ padding: '15px', color: '#000', fontWeight: 'bold' }}>{new Date(sale.created_at).toLocaleTimeString()}</td>
                        <td style={{ padding: '15px', color: '#000' }}>{sale.customer_name}</td>
                        <td style={{ padding: '15px', textAlign: 'right', color: sale.status === 'cancelado' ? '#ccc' : '#27ae60', fontWeight: '900', textDecoration: sale.status === 'cancelado' ? 'line-through' : 'none' }}>${sale.total}</td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <span style={{ padding: '5px 10px', borderRadius: '10px', backgroundColor: sale.status === 'recibido' ? '#f1c40f' : sale.status === 'entregado' ? '#2ecc71' : '#e74c3c', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                            {sale.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedSale && (
                <div style={{ flex: 0.8, backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '20px', border: '1px solid #eee' }}>
                  <h3 style={{ marginTop: 0, color: '#000' }}>Detalle Venta #{selectedSale.id.slice(0,4)}</h3>
                  
                  <div style={{ marginBottom: '15px', color: '#000000' }}>
                    {selectedSale.sale_items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span>{item.products?.name} x{item.quantity}</span>
                        <span style={{ fontWeight: 'bold' }}>${item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '2px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '18px', color: '#000000' }}>
                    <span>Total</span>
                    <span>${selectedSale.total}</span>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                     {/* BOTÓN ENTREGADO */}
                     {selectedSale.status === 'recibido' && (
                       <button onClick={() => updateSaleStatus(selectedSale.id, 'entregado')} style={{ padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                         MARCAR COMO ENTREGADO
                       </button>
                     )}

                     {userRole === 'admin' && selectedSale.status !== 'cancelado' && (
                       <button onClick={() => updateSaleStatus(selectedSale.id, 'cancelado')} style={{ padding: '10px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR VENTA</button>
                     )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FINANZAS */}
      {showFinances && userRole === 'admin' && (
        <div onClick={() => setShowFinances(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#fff', padding: '40px', borderRadius: '30px', width: '1050px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowFinances(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}>
              <X size={30}/>
            </button>
            
            <div style={{ marginBottom: '25px', paddingRight: '50px' }}>
              <h2 style={{ color: '#000000', fontWeight: '900', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PieChart size={28}/> Finanzas (Administrador)
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Calendar size={18} color="#4a3728" />
                <input type="date" value={financeDate} onChange={(e) => setFinanceDate(e.target.value)} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '14px' }} />
                <button onClick={fetchFinances} disabled={loading} style={{ padding: '10px 20px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} /> ACTUALIZAR
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Cargando datos financieros...</div>
            ) : !dailyProfit && !dailyUtility ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No hay datos financieros para esta fecha</div>
            ) : (
              <>
                {/* TARJETAS RESUMEN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)', padding: '25px', borderRadius: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <TrendingUp size={28} />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>Ingresos del Día</span>
                    </div>
                    <div style={{ fontSize: '40px', fontWeight: '900' }}>
                      ${(dailyProfit?.ingresos || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                      De {dailyUtility ? `${dailyUtility.ingresos_totales} productos vendidos` : 'ventas totales'}
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #e74c3c, #ec7063)', padding: '25px', borderRadius: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <AlertTriangle size={28} />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>Gastos del Día</span>
                    </div>
                    <div style={{ fontSize: '40px', fontWeight: '900' }}>
                      ${totalGastosReales.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                      Incluye productos y gastos operativos
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #9b59b6, #bb8fce)', padding: '25px', borderRadius: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <DollarSign size={28} />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>Utilidad Neta del Día</span>
                    </div>
                    <div style={{ fontSize: '40px', fontWeight: '900' }}>
                      ${utilidadNetaReal.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                      Ingresos - Gastos Totales
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #3498db, #5dade2)', padding: '25px', borderRadius: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <PieChart size={28} />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>Margen</span>
                    </div>
                    <div style={{ fontSize: '40px', fontWeight: '900' }}>
                      {dailyProfit?.ingresos > 0 
                        ? ((utilidadNetaReal / dailyProfit.ingresos) * 100).toFixed(1) 
                        : '0.0'}%
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                      Ganancia por cada peso vendido
                    </div>
                  </div>
                </div>

                {/* NUEVO: DESGLOSE DE GASTOS OPERATIVOS */}
                {dailyExpenses.length > 0 && (
                  <div style={{ background: '#fff3e0', padding: '25px', borderRadius: '20px', marginBottom: '25px', border: '2px solid #ff9800' }}>
                    <h3 style={{ color: '#000000', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Receipt size={24} color="#ff9800"/> Desglose de Gastos Operativos del Día
                    </h3>
                    <div style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#ff9800', color: '#fff' }}>
                          <tr>
                            <th style={{ padding: '15px', textAlign: 'left', fontWeight: '900' }}>Categoría</th>
                            <th style={{ padding: '15px', textAlign: 'left', fontWeight: '900' }}>Concepto</th>
                            <th style={{ padding: '15px', textAlign: 'right', fontWeight: '900' }}>Monto</th>
                            <th style={{ padding: '15px', textAlign: 'center', fontWeight: '900' }}>Hora</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyExpenses.map((expense, idx) => (
                            <tr key={expense.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '15px', color: '#000000', fontWeight: '600' }}>
                                {expense.categoria}
                              </td>
                              <td style={{ padding: '15px', color: '#000000' }}>
                                {expense.concepto}
                              </td>
                              <td style={{ padding: '15px', textAlign: 'right', color: '#e74c3c', fontWeight: '900' }}>
                                ${parseFloat(expense.monto).toFixed(2)}
                              </td>
                              <td style={{ padding: '15px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                                {new Date(expense.created_at).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background: '#fff3e0' }}>
                            <td colSpan="2" style={{ padding: '15px', color: '#000000', fontWeight: '900', fontSize: '16px' }}>
                              TOTAL GASTOS OPERATIVOS
                            </td>
                            <td style={{ padding: '15px', textAlign: 'right', color: '#ff9800', fontWeight: '900', fontSize: '18px' }}>
                              ${totalGastosOperativos.toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TABLA RESUMEN FINANCIERO */}
                <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '20px' }}>
                  <h3 style={{ color: '#000000', fontWeight: '900', marginBottom: '20px' }}>📊 Resumen Financiero Completo</h3>
                  <div style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#9b59b6', color: '#fff' }}>
                        <tr>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '900' }}>Concepto</th>
                          <th style={{ padding: '15px', textAlign: 'right', fontWeight: '900' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px', color: '#000000', fontWeight: '600' }}>💰 Ingresos Totales</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: '#27ae60', fontWeight: '900' }}>
                            ${(dailyProfit?.ingresos || 0).toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px 15px 15px 35px', color: '#666', fontSize: '14px' }}>📦 Costo de Productos</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: '#e74c3c', fontWeight: '900' }}>
                            -${(dailyUtility?.costo_total_productos || 0).toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px', color: '#000000', fontWeight: '600' }}>💵 Utilidad Bruta</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: '#3498db', fontWeight: '900' }}>
                            ${(dailyUtility?.utilidad_bruta || 0).toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px 15px 15px 35px', color: '#666', fontSize: '14px' }}>🛒 Gastos Operativos</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: '#ff9800', fontWeight: '900' }}>
                            -${totalGastosOperativos.toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '2px solid #9b59b6' }}>
                          <td style={{ padding: '15px', color: '#000000', fontWeight: '600' }}>📉 Total Gastos del Día</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: '#e74c3c', fontWeight: '900' }}>
                            -${totalGastosReales.toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ background: '#f8f9fa' }}>
                          <td style={{ padding: '15px', color: '#000000', fontWeight: '900', fontSize: '16px' }}>✅ UTILIDAD NETA</td>
                          <td style={{ padding: '15px', textAlign: 'right', color: utilidadNetaReal >= 0 ? '#27ae60' : '#e74c3c', fontWeight: '900', fontSize: '18px' }}>
                            ${utilidadNetaReal.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
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