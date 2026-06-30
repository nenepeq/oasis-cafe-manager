import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import './App.css';
import { useCart } from './hooks/useCart';
import * as apiService from './services/apiService';
import { getMXTimestamp } from './utils/dates';
import { useData } from './context/DataContext';
import {
  Coffee, Snowflake, CupSoda, Utensils, ShoppingCart,
  LogOut, IceCream, FileText, RefreshCw, CakeSlice,
  Banknote, RotateCcw, X, Package, PieChart, Award, Trash2, Plus, Minus, CreditCard,
  Wifi, WifiOff, CloudSync, ClipboardList, Clock, Search,
  Sun, Moon // Iconos añadidos
} from 'lucide-react';
import { logActivity } from './utils/logger';
import { savePendingSale } from './utils/db';
import { sanitizeName } from './utils/sanitize';
import { formatUserError } from './utils/errorHandler';
import { useToast } from './hooks/useToast.jsx';

// Componentes (carga directa para Login, lazy para modales pesados)
import Login from './components/Login';
const InventoryModal = lazy(() => import('./components/InventoryModal'));
const FinanceModal = lazy(() => import('./components/FinanceModal'));
const SalesModal = lazy(() => import('./components/SalesModal'));
const CashArqueoModal = lazy(() => import('./components/CashArqueoModal'));
const StarProductsModal = lazy(() => import('./components/StarProductsModal'));
const CatalogModal = lazy(() => import('./components/CatalogModal'));


/**
 * Componente de tarjeta de producto memoizado.
 * Solo se re-renderiza si cambian sus props (producto, stock, qty en carrito).
 */
const ProductCard = React.memo(({ product, isOutOfStock, onAdd, categoryIcon }) => (
  <button
    onClick={() => onAdd(product)}
    className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
    disabled={isOutOfStock}
    aria-label={`${product.name} - $${parseFloat(product.sale_price).toFixed(2)}${isOutOfStock ? ' (Agotado)' : ''}`}
  >
    <div className="product-card__icon">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="product-card__image"
        />
      ) : (
        <div className="product-card__icon-wrapper">
          {categoryIcon}
        </div>
      )}
    </div>
    <div className="product-name">{product.name}</div>
    <div className="product-price">${parseFloat(product.sale_price).toFixed(2)}</div>
  </button>
));

function App() {
  const {
    user,
    userRole,
    loading,
    setLoading,
    products,
    inventoryList,
    setInventoryList,
    isOnline,
    isSyncing,
    hasPendingItems,
    setHasPendingItems,
    checkPendingItems,
    syncOfflineData,
    fetchStarProducts,
    categories,
    fetchInventory,
    setCashObservations,
    setCashPhysicalCount,
    handleLogout
  } = useData();

  // --- ESTADOS LOCALES DE INTERFAZ DE TIENDA Y FORMULARIOS ---
  const [confirmPaymentStep, setConfirmPaymentStep] = useState(false); // Safety toggle
  const { showToast } = useToast();

  const { cart, setCart, addToCart, removeFromCart, updateCartQty } = useCart(inventoryList);
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

  // --- TEMA (DARK MODE) ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
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

  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  const handleFabClick = () => {
    if (!isDragging.current) {
      if (isSearchOpen) {
        setSearchQuery(''); // Clear query when closing manually
      }
      setIsSearchOpen(!isSearchOpen);
    }
  };

  // --- TODA LA LÓGICA DE DATOS (CONEXIÓN, REALTIME, AUTH, PRODUCTOS, INVENTARIO, FINANZAS) AHORA SE GESTIONA EN DATA CONTEXT ---

  // --- LÓGICA DE VENTAS ---

  const handleSale = async () => {
    console.log('🛒 Iniciando proceso de cobro. Productos en carrito:', cart.length, 'Online:', isOnline, 'Loading:', loading);
    if (cart.length === 0 || loading) {
      console.warn('⚠️ Cancelando cobro: Carrito vacío o cargando activo.');
      return;
    }
    // Verificación de stock previa (doble check)
    for (const item of cart) {
      const currentInvItem = inventoryList.find(inv => inv.product_id === item.id);
      const stockDisponible = currentInvItem?.stock || 0;
      console.log(`📦 Validando stock para ${item.name} (id: ${item.id}). Requerido: ${item.quantity}, Disponible: ${stockDisponible}`);
      if (item.quantity > stockDisponible) {
        showToast(`⚠️ STOCK INSUFICIENTE: ${item.name} tiene ${stockDisponible} unidades, intentas vender ${item.quantity}.`, 'error');
        setLoading(false);
        return;
      }
    }

    const total = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);

    // Validación para A Cuenta
    if (paymentMethod === 'A Cuenta' && !sanitizeName(customerName)) {
      showToast("⚠️ Para ventas A CUENTA, debes ingresar el nombre del cliente obligatoriamente.", "warning");
      return;
    }

    setLoading(true);
    try {
      // SI ESTAMOS OFFLINE, GUARDAR LOCALMENTE
      if (!isOnline) {
        console.log('💾 Guardando venta en base de datos local (IndexedDB)...');
        await savePendingSale({
          total: cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0),
          status: "recibido",
          created_by: user.id,
          customer_name: sanitizeName(customerName) || 'Cliente Mostrador',
          payment_method: paymentMethod,
          items: cart,
          timestamp: getMXTimestamp() // Usar zona horaria de México
        });
        console.log('✅ Venta guardada con éxito en IndexedDB.');

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

      console.log('📡 Registrando venta online en Supabase...');
      const saleData = {
        total: total,
        status: "recibido",
        created_by: user.id,
        customer_name: sanitizeName(customerName) || 'Cliente Mostrador',
        payment_method: paymentMethod
      };

      const { data: sale, error: saleError } = await apiService.insertSaleWithItems(saleData, cart);

      if (saleError) {
        console.error('❌ Error de Supabase al registrar la venta:', saleError);
        throw saleError;
      }
      console.log('✅ Venta registrada online con éxito. ID:', sale.id);

      showToast("✅ Venta registrada", "success");

      // LOG DE ACTIVIDAD (Sin await para no demorar la respuesta de la interfaz)
      logActivity(user?.id || user.id, 'CREACION_VENTA', 'VENTAS', {
        sale_id: sale.id,
        total: sale.total,
        customer: sale.customer_name,
        payment_method: sale.payment_method,
        items_count: cart.length
      }).catch(err => console.error('Error al registrar log de actividad de venta:', err));

      setCart([]); setCustomerName(''); setCustomerPhone(''); fetchInventory();

    } catch (err) { 
      console.error('❌ Excepción capturada en handleSale:', err);
      showToast("Error: " + formatUserError(err), "error"); 
    }
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

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesCategory = selectedCategory === 'Todos' ? true : (p.category || '').trim() === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isVisible = p.is_visible !== false;
    return matchesCategory && matchesSearch && isVisible;
  }), [products, selectedCategory, searchQuery]);

  if (!user) return <Login />;

  return (
    <div className="app-container" style={{
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      transition: 'background-color 0.3s ease, color 0.3s ease'
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
              role="status"
              aria-label={isOnline ? (isSyncing ? 'Sincronizando datos' : 'Conectado a internet') : 'Sin conexión a internet'}
              title={isOnline ? (isSyncing ? 'Sincronizando...' : 'Conectado') : 'Sin Internet (Modo Avión)'} 
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px',
                borderRadius: '50%', background: isOnline ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                color: isOnline ? '#2d6a4f' : '#c0392b',
                border: isOnline ? '1px solid rgba(39, 174, 96, 0.3)' : '1px solid rgba(231, 76, 60, 0.3)',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}>
              {isOnline ? (isSyncing ? <CloudSync size={18} className="spin" aria-hidden="true" /> : <Wifi size={18} aria-hidden="true" />) : <WifiOff size={18} aria-hidden="true" />}
              {hasPendingItems && !isSyncing && (
                <div style={{
                  position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px',
                  borderRadius: '50%', backgroundColor: '#f1c40f', border: '2px solid #fff', boxShadow: '0 0 5px rgba(0,0,0,0.2)'
                }} aria-label="Datos pendientes de sincronizar" role="status" />
              )}
            </div>
            {isOnline && hasPendingItems && !isSyncing && (
              <button
                onClick={syncOfflineData}
                aria-label="Sincronizar datos pendientes"
                title="Sincronizar datos pendientes"
                className="btn-active-effect"
                style={{
                  background: '#f1c40f', color: '#fff', border: 'none', padding: '8px',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            )}
            {userRole === 'admin' && (
              <>
                <button onClick={() => setShowCatalog(true)} aria-label="Gestión de Catálogo" title="Gestión de Catálogo" className="btn-active-effect" style={{ background: '#4a3728', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><ClipboardList size={16} aria-hidden="true" /></button>
                <button onClick={() => setShowInventory(true)} aria-label="Inventario" title="Inventario" className="btn-active-effect" style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><Package size={16} aria-hidden="true" /></button>
                <button onClick={() => { setShowStarProducts(true); fetchStarProducts(); }} aria-label="Productos Estrella" title="Productos Estrella" className="btn-active-effect" style={{ background: '#f1c40f', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><Award size={16} aria-hidden="true" /></button>
                <button onClick={() => { setShowCashArqueo(true); setCashObservations(''); setCashPhysicalCount(0); }} aria-label="Arqueo de Caja" title="Arqueo de Caja" className="btn-active-effect" style={{ background: '#e67e22', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><Banknote size={16} aria-hidden="true" /></button>
              </>
            )}
            <button onClick={() => setShowReport(true)} aria-label="Reporte de Ventas" title="Reporte de Ventas" className="btn-active-effect" style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><FileText size={16} aria-hidden="true" /></button>
            {userRole === 'admin' && <button onClick={() => setShowFinances(true)} aria-label="Finanzas" title="Finanzas" className="btn-active-effect" style={{ background: '#9b59b6', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px' }}><PieChart size={16} aria-hidden="true" /></button>}
            <button onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" className="btn-active-effect" style={{ background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', padding: '8px', borderRadius: '10px' }}><LogOut size={16} aria-hidden="true" /></button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', flex: 1 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="btn-active-effect"
                style={{
                  padding: '6px 10px',
                  borderRadius: '15px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: selectedCategory === cat ? 'var(--text-primary)' : 'var(--bg-secondary)',
                  color: selectedCategory === cat ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontWeight: 'bold',
                  fontSize: '10px',
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

        <div className="custom-scrollbar product-scroll-area">
          <div className="product-grid">
            {filteredProducts.map(p => {
              const invItem = inventoryList.find(inv => inv.product_id === p.id);
              const cartItem = cart.find(i => i.id === p.id);
              const qtyInCart = cartItem ? cartItem.quantity : 0;
              const totalStock = invItem ? invItem.stock : 0;
              const isOutOfStock = totalStock - qtyInCart <= 0;

              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  isOutOfStock={isOutOfStock}
                  onAdd={addToCart}
                  categoryIcon={getCategoryIcon(p)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN CARRITO */}
      <div className="cart-section">
        <div className="cart-header-compact" style={{ height: '25px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ShoppingCart size={18} /> Carrito
            <button
              onClick={toggleTheme}
              className="btn-active-effect"
              aria-label={theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
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
          <label htmlFor="customer-name" className="sr-only">Nombre del cliente</label>
          <input
            id="customer-name"
            type="text"
            placeholder="Pedido a nombre de..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            aria-label="Nombre del cliente para el pedido"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: 'none', backgroundColor: '#3498db', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box', fontSize: '13px' }}
          />
        </div>
        <div className="custom-scrollbar cart-scroll-area">
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
                  aria-label={`Eliminar ${item.name} del carrito`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                  title="Eliminar"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-highlight)', borderRadius: '8px', padding: '2px 5px', border: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="btn-active-effect"
                        aria-label={`Reducir cantidad de ${item.name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '2px' }}
                      >
                        <Minus size={12} aria-hidden="true" />
                      </button>
                      <span aria-label={`Cantidad: ${item.quantity}`} style={{ margin: '0 8px', fontWeight: 'bold', minWidth: '15px', textAlign: 'center', color: 'var(--text-primary)' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className={`btn-active-effect ${((inventoryList.find(inv => inv.product_id === item.id)?.stock || 0) <= item.quantity) ? 'opacity-50 pointer-events-none' : ''}`}
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '2px' }}
                        disabled={(inventoryList.find(inv => inv.product_id === item.id)?.stock || 0) <= item.quantity}
                      >
                        <Plus size={12} aria-hidden="true" />
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

      {/* MODALES MODULARIZADOS (lazy loaded) */}
      <Suspense fallback={null}>
        {showInventory && (
          <InventoryModal
            showInventory={showInventory} setShowInventory={setShowInventory} loading={loading}
          />
        )}
        {showFinances && (
          <FinanceModal
            showFinances={showFinances} setShowFinances={setShowFinances} loading={loading}
          />
        )}
        {showReport && (
          <SalesModal
            showReport={showReport} setShowReport={setShowReport} loading={loading}
          />
        )}
        {showCashArqueo && (
          <CashArqueoModal
            showCashArqueo={showCashArqueo} setShowCashArqueo={setShowCashArqueo} loading={loading}
          />
        )}
        {showStarProducts && (
          <StarProductsModal
            showStarProducts={showStarProducts} setShowStarProducts={setShowStarProducts}
          />
        )}
        {showCatalog && (
          <CatalogModal
            showCatalog={showCatalog} setShowCatalog={setShowCatalog}
          />
        )}
      </Suspense>

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