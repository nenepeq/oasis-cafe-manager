import React from 'react';
import { Package, RefreshCw, X, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

/**
 * Modal de Gestión de Inventario, Compras y Gastos
 */
const InventoryModal = ({
    showInventory,
    setShowInventory,
    userRole,
    fetchInventory,
    loading,
    inventoryList,
    products,
    selectedPurchaseProd,
    setSelectedPurchaseProd,
    purchaseQty,
    setPurchaseQty,
    purchaseCost,
    setPurchaseCost,
    purchaseCart,
    setPurchaseCart,
    handleRegisterPurchase,
    expenseCategoria,
    setExpenseCategoria,
    expenseMonto,
    setExpenseMonto,
    expenseConcepto,
    setExpenseConcepto,
    expenseCategories,
    handleRegisterExpense
}) => {
    if (!showInventory || userRole !== 'admin') return null;

    return (
        <div
            onClick={() => setShowInventory(false)}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="modal-content-responsive"
                style={{
                    position: 'relative',
                    backgroundColor: '#fff',
                    padding: '20px',
                    borderRadius: '20px',
                    width: '95%',
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <button
                    onClick={() => setShowInventory(false)}
                    style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}
                >
                    <X size={24} />
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '60px' }}>
                    <h2 style={{ color: '#000000', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
                        <Package size={24} /> Reporte de Stock y Gastos
                    </h2>
                    <button
                        onClick={fetchInventory}
                        disabled={loading}
                        className="btn-active-effect"
                        style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {/* SECCIÓN: EXISTENCIAS */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>EXISTENCIAS</h3>
                        <div className="table-container no-scrollbar" style={{
                            maxHeight: '600px',
                            overflowY: 'auto'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead style={{ background: '#f8f6f2' }}>
                                    <tr>
                                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Producto</th>
                                        <th style={{ padding: '10px', color: '#000' }}>Cantidad</th>
                                        <th style={{ padding: '10px', color: '#000' }}>Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryList.map((inv, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px', color: '#000', fontWeight: '600' }}>{inv.products?.name}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: '900', color: '#000' }}>{inv.stock}</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                {inv.stock <= 5 ? <AlertTriangle color="#e74c3c" size={16} /> : <CheckCircle color="#27ae60" size={16} />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: ENTRADAS Y GASTOS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* SECCIÓN: ENTRADA DE MERCANCÍAS */}
                        <div style={{
                            background: '#fdfbf9',
                            padding: '20px',
                            borderRadius: '15px',
                            border: '1px solid #f1ece6',
                            boxSizing: 'border-box',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }} className="no-scrollbar">
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
                                <input
                                    type="number"
                                    placeholder="Unidades"
                                    value={purchaseQty || ''}
                                    onChange={(e) => setPurchaseQty(parseInt(e.target.value) || 0)}
                                    style={{ flex: 1, minWidth: '0', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box' }}
                                />
                                <input
                                    type="number"
                                    placeholder="$ Costo unitario"
                                    value={purchaseCost || ''}
                                    onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                                    style={{ flex: 1, minWidth: '0', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box' }}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const p = products.find(x => x.id === selectedPurchaseProd);
                                    if (p && purchaseQty > 0 && purchaseCost > 0) {
                                        setPurchaseCart([...purchaseCart, { ...p, qty: purchaseQty, cost: purchaseCost }]);
                                        setSelectedPurchaseProd('');
                                        setPurchaseQty(0);
                                        setPurchaseCost(0);
                                    }
                                }}
                                disabled={!selectedPurchaseProd || !purchaseQty || !purchaseCost}
                                className={selectedPurchaseProd && purchaseQty && purchaseCost ? "btn-active-effect" : ""}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: '#3498db',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '900',
                                    cursor: (selectedPurchaseProd && purchaseQty && purchaseCost) ? 'pointer' : 'not-allowed',
                                    opacity: (selectedPurchaseProd && purchaseQty && purchaseCost) ? 1 : 0.5
                                }}
                            >
                                + AÑADIR
                            </button>
                            <div style={{ marginTop: '15px', color: '#000' }}>
                                {purchaseCart.map((item, i) => (
                                    <div key={i} style={{
                                        fontSize: '12px',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: '#fff',
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid #eee'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '600' }}>📦 {item.name}</span>
                                            <span style={{ color: '#666' }}>{item.qty} x ${item.cost}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontWeight: '900' }}>${(item.qty * item.cost).toFixed(2)}</span>
                                            <button
                                                onClick={() => setPurchaseCart(purchaseCart.filter((_, idx) => idx !== i))}
                                                style={{ border: 'none', background: 'none', color: '#dc2626', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                className="btn-active-effect"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} strokeWidth={2} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {purchaseCart.length > 0 && (
                                    <button
                                        onClick={handleRegisterPurchase}
                                        disabled={loading}
                                        className="btn-active-effect"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: loading ? '#ccc' : '#27ae60',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: '900',
                                            marginTop: '10px',
                                            cursor: loading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {loading ? <RefreshCw className="spin" size={16} /> : 'REGISTRAR COMPRA'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN: GASTOS DE OPERACIÓN */}
                        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '15px', border: '2px solid #ff9800' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '10px' }}>GASTOS DE OPERACIÓN</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <select value={expenseCategoria} onChange={(e) => setExpenseCategoria(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}>
                                    {expenseCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                                </select>
                                <input
                                    type="number"
                                    placeholder="$ 0.00"
                                    value={expenseMonto || ''}
                                    onChange={(e) => setExpenseMonto(parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Concepto"
                                value={expenseConcepto}
                                onChange={(e) => setExpenseConcepto(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', marginTop: '10px' }}
                            />
                            <button
                                onClick={handleRegisterExpense}
                                disabled={loading}
                                className="btn-active-effect"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: loading ? '#ccc' : '#ff9800',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '900',
                                    marginTop: '10px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <RefreshCw className="spin" size={16} /> : 'REGISTRAR GASTO'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryModal;
