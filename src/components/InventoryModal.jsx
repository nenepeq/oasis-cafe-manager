import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, X, AlertTriangle, CheckCircle, Trash2, Download, Loader2, XCircle } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
    expenseFile,
    setExpenseFile,
    purchaseFile,
    setPurchaseFile,
    expenseCategories,
    expenseCart,
    setExpenseCart,
    handleRegisterExpense,
    // Props de Mermas
    selectedShrinkageProd,
    setSelectedShrinkageProd,
    shrinkageQty,
    setShrinkageQty,
    shrinkageReason,
    setShrinkageReason,
    handleRegisterShrinkage
}) => {
    const [activeTab, setActiveTab] = useState('existencias'); // 'existencias' | 'entradas' | 'gastos' | 'mermas'
    const [expensePreview, setExpensePreview] = useState(null);
    const [purchasePreview, setPurchasePreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Limpiar previsualizaciones cuando los archivos se resetean en App.jsx
    useEffect(() => {
        if (!expenseFile) setExpensePreview(null);
    }, [expenseFile]);

    useEffect(() => {
        if (!purchaseFile) setPurchasePreview(null);
    }, [purchaseFile]);

    const handleFileChange = (e, setFile, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file);
            setPreviewLoading(true);
            const reader = new FileReader();
            reader.onerror = (err) => {
                setPreviewLoading(false);
            };
            reader.onloadend = () => {
                setPreview(reader.result);
                setPreviewLoading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!showInventory || userRole !== 'admin') return null;

    const handleExportInventoryExcel = async () => {
        if (inventoryList.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');

        // 1. Encabezado
        worksheet.mergeCells('A1:C1');
        const mainHeader = worksheet.getCell('A1');
        mainHeader.value = 'OASIS CAFÉ - REPORTE DE EXISTENCIAS';
        mainHeader.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } };
        mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        mainHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };

        worksheet.getCell('A2').value = `Generado: ${new Date().toLocaleString()}`;
        worksheet.getRow(2).font = { bold: true };

        // 2. Datos para la tabla
        const rows = inventoryList.map(inv => [
            inv.products?.name || 'N/A',
            inv.stock,
            inv.stock === 0 ? "❌ SIN STOCK" : (inv.stock <= 5 ? "⚠️ STOCK BAJO" : "✅ DISPONIBLE")
        ]);

        worksheet.addTable({
            name: 'InventarioActual',
            ref: 'A4',
            headerRow: true,
            style: {
                theme: 'TableStyleMedium9', // Un verde/gris profesional
                showRowStripes: true,
            },
            columns: [
                { name: 'Producto', filterButton: true },
                { name: 'Stock Actual', filterButton: true },
                { name: 'Estatus', filterButton: true },
            ],
            rows: rows,
        });

        // 3. Estilos de columna
        worksheet.getColumn(1).width = 40;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 20;

        // Formato condicional visual manual para estatus bajo o sin stock
        rows.forEach((r, idx) => {
            if (r[2] === "⚠️ STOCK BAJO" || r[2] === "❌ SIN STOCK") {
                const cell = worksheet.getCell(5 + idx, 3);
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Inventario_Oasis_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

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
                className="modal-content-responsive glass-modal-content"
                style={{
                    position: 'relative',
                    // backgroundColor: '#fff', // Replaced by class
                    padding: '20px',
                    // borderRadius: '20px', // Replaced by class
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '40px' }}>
                    <h2 style={{ color: '#000000', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
                        <Package size={24} /> Stock y Gastos
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={fetchInventory}
                            disabled={loading}
                            className="btn-active-effect"
                            style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer', marginRight: '10px' }}
                        >
                            <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* SELECTOR DE TABS */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '5px', borderRadius: '15px', borderBottom: '2px solid var(--border-subtle)' }}>
                    <button
                        onClick={() => setActiveTab('existencias')}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none', fontSize: '13px',
                            background: activeTab === 'existencias' ? 'var(--bg-soft)' : 'transparent',
                            color: activeTab === 'existencias' ? 'var(--color-secondary)' : 'var(--color-primary)',
                            fontWeight: '900', cursor: 'pointer',
                            borderBottom: activeTab === 'existencias' ? '3px solid var(--color-secondary)' : '3px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        EXISTENCIAS
                    </button>
                    <button
                        onClick={() => setActiveTab('entradas')}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none', fontSize: '13px',
                            background: activeTab === 'entradas' ? 'var(--bg-soft)' : 'transparent',
                            color: activeTab === 'entradas' ? 'var(--color-secondary)' : 'var(--color-primary)',
                            fontWeight: '900', cursor: 'pointer',
                            borderBottom: activeTab === 'entradas' ? '3px solid var(--color-secondary)' : '3px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        ENTRADAS
                    </button>
                    <button
                        onClick={() => setActiveTab('gastos')}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none', fontSize: '13px',
                            background: activeTab === 'gastos' ? 'var(--bg-soft)' : 'transparent',
                            color: activeTab === 'gastos' ? 'var(--color-secondary)' : 'var(--color-primary)',
                            fontWeight: '900', cursor: 'pointer',
                            borderBottom: activeTab === 'gastos' ? '3px solid var(--color-secondary)' : '3px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        GASTOS
                    </button>
                    <button
                        onClick={() => setActiveTab('mermas')}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none', fontSize: '13px',
                            background: activeTab === 'mermas' ? 'var(--bg-soft)' : 'transparent',
                            color: activeTab === 'mermas' ? 'var(--color-secondary)' : 'var(--color-primary)',
                            fontWeight: '900', cursor: 'pointer',
                            borderBottom: activeTab === 'mermas' ? '3px solid var(--color-secondary)' : '3px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        MERMAS
                    </button>
                </div>

                <div>
                    {/* SECCIÓN: EXISTENCIAS */}
                    {activeTab === 'existencias' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000', margin: 0 }}>EXISTENCIAS ACTUALES</h3>
                                {inventoryList.length > 0 && (
                                    <button
                                        onClick={handleExportInventoryExcel}
                                        className="btn-active-effect"
                                        style={{ padding: '6px 12px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <Download size={14} /> EXCEL
                                    </button>
                                )}
                            </div>
                            <div className="table-container no-scrollbar" style={{
                                maxHeight: '50vh',
                                overflowY: 'auto'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                                    <thead style={{ background: 'var(--bg-highlight)', borderBottom: '2px solid var(--color-secondary)' }}>
                                        <tr>
                                            <th style={{ padding: '12px 5px', textAlign: 'left', color: '#000' }}>Producto</th>
                                            <th style={{ padding: '12px 5px', color: '#000', width: '70px', textAlign: 'center' }}>Stock</th>
                                            <th style={{ padding: '12px 5px', color: '#000', width: '50px', textAlign: 'center' }}>Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryList.map((inv, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid rgba(74, 55, 40, 0.1)' }}>
                                                <td style={{
                                                    padding: '12px 5px',
                                                    color: '#000',
                                                    fontWeight: '600',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }} title={inv.products?.name}>
                                                    {inv.products?.name}
                                                </td>
                                                <td style={{ padding: '12px 5px', textAlign: 'center', fontWeight: '900', color: '#000' }}>{inv.stock}</td>
                                                <td style={{ padding: '12px 5px', textAlign: 'center' }}>
                                                    {inv.stock === 0 ? (
                                                        <XCircle color="#e74c3c" size={16} />
                                                    ) : inv.stock <= 5 ? (
                                                        <AlertTriangle color="#e74c3c" size={16} />
                                                    ) : (
                                                        <CheckCircle color="#27ae60" size={16} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN: ENTRADAS DE INVENTARIO (CARRITO) */}
                    {activeTab === 'entradas' && (
                        <div style={{ background: '#fdfbf9', padding: '20px', borderRadius: '15px', border: '1px solid #f1ece6' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '15px' }}>REGISTRO DE ENTRADAS (STOCK)</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                                <select
                                    value={selectedPurchaseProd}
                                    onChange={(e) => setSelectedPurchaseProd(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <input
                                        type="number"
                                        placeholder="Unidades"
                                        min="1"
                                        value={purchaseQty || ''}
                                        onChange={(e) => setPurchaseQty(parseInt(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="$ Costo Total"
                                        min="0.01"
                                        step="0.01"
                                        value={purchaseCost || ''}
                                        onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const p = products.find(x => x.id === selectedPurchaseProd);
                                        if (p && purchaseQty > 0 && purchaseCost > 0) {
                                            // Calculamos el costo unitario a partir del total ingresado
                                            const unitCost = purchaseCost / purchaseQty;
                                            setPurchaseCart([...purchaseCart, { ...p, qty: purchaseQty, cost: unitCost }]);
                                            setSelectedPurchaseProd('');
                                            setPurchaseQty(0);
                                            setPurchaseCost(0);
                                        }
                                    }}
                                    disabled={!selectedPurchaseProd || purchaseQty <= 0 || purchaseCost <= 0}
                                    style={{
                                        padding: '12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold',
                                        cursor: (!selectedPurchaseProd || purchaseQty <= 0 || purchaseCost <= 0) ? 'not-allowed' : 'pointer',
                                        opacity: (!selectedPurchaseProd || purchaseQty <= 0 || purchaseCost <= 0) ? 0.6 : 1
                                    }}
                                >
                                    + AÑADIR AL INVENTARIO
                                </button>
                            </div>

                            {/* LISTA DE ÍTEMS EN EL TICKET DE ENTRADA */}
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>PRODUCTOS A INGRESAR:</h4>
                                {purchaseCart.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px', background: '#f5f5f5', borderRadius: '10px', border: '1px dashed #ccc' }}>
                                        No hay productos agregados aún
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {purchaseCart.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fff', borderRadius: '10px', border: '1px solid #eee' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#666' }}>{item.qty} unids x ${item.cost.toFixed(2)} unit.</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontWeight: '900', color: '#27ae60' }}>${(item.qty * item.cost).toFixed(2)}</span>
                                                    <button onClick={() => setPurchaseCart(purchaseCart.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '16px', fontWeight: '900', color: '#27ae60' }}>
                                            TOTAL COMPRA: ${purchaseCart.reduce((a, b) => a + (b.cost * b.qty), 0).toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FOTO DEL TICKET GLOBAL (COMPRAS) */}
                            <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={() => document.getElementById('purchase-file-input').click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', background: '#34495e', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        <Package size={14} /> {purchaseFile ? 'CAMBIAR FOTO DEL TICKET' : 'TOMAR FOTO DEL TICKET'}
                                    </button>
                                    <input
                                        id="purchase-file-input"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange(e, setPurchaseFile, setPurchasePreview)}
                                    />
                                    {purchasePreview && (
                                        <div style={{ position: 'relative' }}>
                                            <img src={purchasePreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                                            <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#27ae60', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircle size={10} color="#fff" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleRegisterPurchase}
                                disabled={loading || purchaseCart.length === 0}
                                style={{
                                    width: '100%', padding: '15px', background: (loading || purchaseCart.length === 0) ? '#ccc' : '#27ae60',
                                    color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '16px',
                                    cursor: (loading || purchaseCart.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <RefreshCw className="spin" size={20} /> : 'FINALIZAR REGISTRO DE COMPRA'}
                            </button>
                        </div>
                    )}

                    {/* SECCIÓN: GASTOS DE OPERACIÓN (CARRITO) */}
                    {activeTab === 'gastos' && (
                        <div style={{ background: '#fdfbf9', padding: '20px', borderRadius: '15px', border: '1px solid #f1ece6' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '15px' }}>REGISTRO DE GASTOS (POR TICKET)</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                                    <select value={expenseCategoria} onChange={(e) => setExpenseCategoria(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}>
                                        {expenseCategories.map((cat, idx) => <option key={idx} value={cat} disabled={cat.startsWith('---')}>{cat}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="$ Monto"
                                        min="0.01"
                                        step="0.01"
                                        value={expenseMonto || ''}
                                        onChange={(e) => setExpenseMonto(parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Concepto (ej. Detergente, Jabón, Pan...)"
                                    value={expenseConcepto}
                                    onChange={(e) => setExpenseConcepto(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                />
                                <button
                                    onClick={() => {
                                        if (expenseConcepto.trim() && expenseMonto > 0) {
                                            setExpenseCart([...expenseCart, { concepto: expenseConcepto.trim(), categoria: expenseCategoria, monto: expenseMonto }]);
                                            setExpenseConcepto('');
                                            setExpenseMonto(0);
                                        }
                                    }}
                                    disabled={!expenseConcepto.trim() || expenseMonto <= 0}
                                    style={{
                                        padding: '12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold',
                                        cursor: (!expenseConcepto.trim() || expenseMonto <= 0) ? 'not-allowed' : 'pointer', opacity: (!expenseConcepto.trim() || expenseMonto <= 0) ? 0.6 : 1
                                    }}
                                >
                                    + AÑADIR AL TICKET
                                </button>
                            </div>

                            {/* LISTA DE ÍTEMS EN EL TICKET */}
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>ÍTEMS EN ESTE TICKET:</h4>
                                {expenseCart.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px', background: '#f5f5f5', borderRadius: '10px', border: '1px dashed #ccc' }}>
                                        No hay ítems agregados aún
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {expenseCart.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fff', borderRadius: '10px', border: '1px solid #eee' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.concepto}</div>
                                                    <div style={{ fontSize: '11px', color: '#666' }}>{item.categoria}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontWeight: '900', color: '#e74c3c' }}>${item.monto.toFixed(2)}</span>
                                                    <button onClick={() => setExpenseCart(expenseCart.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '16px', fontWeight: '900', color: '#27ae60' }}>
                                            TOTAL TICKET: ${expenseCart.reduce((a, b) => a + b.monto, 0).toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FOTO DEL TICKET GLOBAL */}
                            <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        onClick={() => document.getElementById('expense-file-input').click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 15px', background: '#34495e', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        <Package size={14} /> {expenseFile ? 'CAMBIAR FOTO DEL TICKET' : 'TOMAR FOTO DEL TICKET'}
                                    </button>
                                    <input
                                        id="expense-file-input"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange(e, setExpenseFile, setExpensePreview)}
                                    />
                                    {expensePreview && (
                                        <div style={{ position: 'relative' }}>
                                            <img src={expensePreview} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                                            <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#27ae60', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircle size={10} color="#fff" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleRegisterExpense}
                                disabled={loading || expenseCart.length === 0}
                                style={{
                                    width: '100%', padding: '15px', background: (loading || expenseCart.length === 0) ? '#ccc' : '#27ae60',
                                    color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '16px',
                                    cursor: (loading || expenseCart.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <RefreshCw className="spin" size={20} /> : 'REGISTRAR TODO EL TICKET'}
                            </button>
                        </div>
                    )}

                    {/* SECCIÓN: MERMAS */}
                    {activeTab === 'mermas' && (
                        <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '15px', border: '2px solid #dc3545' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#721c24', marginBottom: '15px' }}>REGISTRO DE MERMAS Y BAJAS</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <select
                                    value={selectedShrinkageProd}
                                    onChange={(e) => setSelectedShrinkageProd(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {products.map(p => {
                                        const inv = inventoryList.find(i => i.product_id === p.id);
                                        return <option key={p.id} value={p.id}>{p.name} (Stock: {inv ? inv.stock : 0})</option>;
                                    })}
                                </select>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                                    <input
                                        type="number"
                                        placeholder="Cantidad"
                                        min="1"
                                        value={shrinkageQty || ''}
                                        onChange={(e) => setShrinkageQty(parseInt(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                    <select
                                        value={shrinkageReason}
                                        onChange={(e) => setShrinkageReason(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                    >
                                        <option value="Dañado">Dañado / Defectuoso</option>
                                        <option value="Vencido">Vencido / Caducado</option>
                                        <option value="Error Preparación">Error de Preparación</option>
                                        <option value="Cortesía">Cortesía / Regalo</option>
                                        <option value="Robo/Perdida">Robo o Pérdida</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleRegisterShrinkage}
                                    disabled={loading || !selectedShrinkageProd || shrinkageQty <= 0}
                                    className={(selectedShrinkageProd && shrinkageQty > 0) ? "btn-active-effect" : ""}
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        background: loading ? '#ccc' : (selectedShrinkageProd && shrinkageQty > 0 ? '#dc3545' : '#ddd'),
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: '900',
                                        marginTop: '10px',
                                        cursor: (loading || !selectedShrinkageProd || shrinkageQty <= 0) ? 'not-allowed' : 'pointer',
                                        fontSize: '16px'
                                    }}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'REGISTRAR BAJA DE STOCK'}
                                </button>
                                <p style={{ fontSize: '11px', color: '#721c24', fontStyle: 'italic', marginTop: '5px' }}>
                                    * Esta acción descontará el stock e incluirá un registro en gastos con valor $0 para control administrativo.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default InventoryModal;
