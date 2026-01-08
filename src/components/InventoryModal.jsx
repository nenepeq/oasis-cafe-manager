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
                <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', background: '#f0ece6', padding: '5px', borderRadius: '15px' }}>
                    <button
                        onClick={() => setActiveTab('existencias')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '11px',
                            background: activeTab === 'existencias' ? '#fff' : 'transparent',
                            color: '#4a3728', fontWeight: '900', cursor: 'pointer',
                            boxShadow: activeTab === 'existencias' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        EXISTENCIAS
                    </button>
                    <button
                        onClick={() => setActiveTab('entradas')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '11px',
                            background: activeTab === 'entradas' ? '#fff' : 'transparent',
                            color: '#4a3728', fontWeight: '900', cursor: 'pointer',
                            boxShadow: activeTab === 'entradas' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        ENTRADAS
                    </button>
                    <button
                        onClick={() => setActiveTab('gastos')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '11px',
                            background: activeTab === 'gastos' ? '#fff' : 'transparent',
                            color: '#4a3728', fontWeight: '900', cursor: 'pointer',
                            boxShadow: activeTab === 'gastos' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        GASTOS
                    </button>
                    <button
                        onClick={() => setActiveTab('mermas')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '11px',
                            background: activeTab === 'mermas' ? '#fff' : 'transparent',
                            color: '#4a3728', fontWeight: '900', cursor: 'pointer',
                            boxShadow: activeTab === 'mermas' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
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
                                    <thead style={{ background: '#f8f6f2' }}>
                                        <tr>
                                            <th style={{ padding: '12px 5px', textAlign: 'left', color: '#000' }}>Producto</th>
                                            <th style={{ padding: '12px 5px', color: '#000', width: '70px', textAlign: 'center' }}>Stock</th>
                                            <th style={{ padding: '12px 5px', color: '#000', width: '50px', textAlign: 'center' }}>Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryList.map((inv, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
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

                    {/* SECCIÓN: ENTRADA DE MERCANCÍAS */}
                    {activeTab === 'entradas' && (
                        <div style={{
                            background: '#fdfbf9',
                            padding: '20px',
                            borderRadius: '15px',
                            border: '1px solid #f1ece6',
                            boxSizing: 'border-box'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000000', marginBottom: '15px' }}>REGISTRAR ENTRADA</h3>
                            <select
                                value={selectedPurchaseProd}
                                onChange={(e) => setSelectedPurchaseProd(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' }}
                            >
                                <option value="">Seleccionar producto...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                <input
                                    type="number"
                                    placeholder="Cant. Unidades"
                                    min="1"
                                    value={purchaseQty || ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setPurchaseQty(isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                    style={{ flex: 1, minWidth: '0', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' }}
                                />
                                <input
                                    type="number"
                                    placeholder="$ Costo Unitario"
                                    min="0.01"
                                    step="0.01"
                                    value={purchaseCost || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setPurchaseCost(isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                    style={{ flex: 1, minWidth: '0', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' }}
                                />
                            </div>

                            {/* SELECTOR DE IMAGEN PARA COMPRAS */}
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <button
                                        onClick={() => document.getElementById('purchase-file-input').click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        <Package size={14} /> {purchaseFile ? 'CAMBIAR TICKET' : 'ADJUNTAR TICKET'}
                                    </button>
                                    <input
                                        id="purchase-file-input"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange(e, setPurchaseFile, setPurchasePreview)}
                                    />
                                    {previewLoading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontSize: '12px' }}>
                                            <RefreshCw size={14} className="spin" /> Procesando imagen...
                                        </div>
                                    )}
                                    {purchasePreview && !previewLoading && (
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: '#e8f5e9', padding: '5px 10px', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
                                            <div style={{ position: 'relative' }}>
                                                <img src={purchasePreview} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #ddd' }} />
                                                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#fff', borderRadius: '50%', display: 'flex' }}>
                                                    <CheckCircle size={16} color="#27ae60" fill="#fff" />
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2e7d32' }}>✅ LISTO</span>
                                            <button
                                                onClick={() => { setPurchaseFile(null); setPurchasePreview(null); }}
                                                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '5px' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                                disabled={!selectedPurchaseProd || purchaseQty <= 0 || purchaseCost <= 0}
                                className={selectedPurchaseProd && purchaseQty > 0 && purchaseCost > 0 ? "btn-active-effect" : ""}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#3498db',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '900',
                                    cursor: (selectedPurchaseProd && purchaseQty > 0 && purchaseCost > 0) ? 'pointer' : 'not-allowed',
                                    opacity: (selectedPurchaseProd && purchaseQty > 0 && purchaseCost > 0) ? 1 : 0.5
                                }}
                            >
                                AÑADIR INVENTARIO
                            </button>
                            <div style={{ marginTop: '20px', color: '#000' }}>
                                {purchaseCart.map((item, i) => (
                                    <div key={i} style={{
                                        fontSize: '13px',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: '#fff',
                                        padding: '10px',
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
                                                <Trash2 size={18} strokeWidth={2} />
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
                                            padding: '15px',
                                            background: loading ? '#ccc' : '#27ae60',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: '900',
                                            marginTop: '10px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '16px'
                                        }}
                                    >
                                        {loading ? <RefreshCw className="spin" size={16} /> : 'FINALIZAR REGISTRO DE COMPRA'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN: GASTOS DE OPERACIÓN */}
                    {activeTab === 'gastos' && (
                        // ... (código de gastos existente)
                        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '15px', border: '2px solid #ff9800' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '15px' }}>GASTOS DE OPERACIÓN (MISC)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                                    <select value={expenseCategoria} onChange={(e) => setExpenseCategoria(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}>
                                        {expenseCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="$ Monto"
                                        min="0.01"
                                        step="0.01"
                                        value={expenseMonto || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setExpenseMonto(isNaN(val) ? 0 : Math.max(0, val));
                                        }}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Concepto del gasto (ej. Luz, Renta, Limpieza...)"
                                    value={expenseConcepto}
                                    onChange={(e) => setExpenseConcepto(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', fontSize: '14px' }}
                                />

                                {/* SELECTOR DE IMAGEN PARA GASTOS */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '5px 0' }}>
                                    <button
                                        onClick={() => document.getElementById('expense-file-input').click()}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#34495e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        <Package size={14} /> {expenseFile ? 'CAMBIAR TICKET' : 'ADJUNTAR TICKET'}
                                    </button>
                                    <input
                                        id="expense-file-input"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange(e, setExpenseFile, setExpensePreview)}
                                    />
                                    {previewLoading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontSize: '12px' }}>
                                            <RefreshCw size={14} className="spin" /> Procesando imagen...
                                        </div>
                                    )}
                                    {expensePreview && !previewLoading && (
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', background: '#e8f5e9', padding: '5px 10px', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
                                            <div style={{ position: 'relative' }}>
                                                <img src={expensePreview} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #ddd' }} />
                                                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#fff', borderRadius: '50%', display: 'flex' }}>
                                                    <CheckCircle size={16} color="#27ae60" fill="#fff" />
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2e7d32' }}>✅ LISTO</span>
                                            <button
                                                onClick={() => { setExpenseFile(null); setExpensePreview(null); }}
                                                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '5px' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleRegisterExpense}
                                    disabled={loading || expenseMonto <= 0 || !expenseConcepto.trim()}
                                    className={(expenseMonto > 0 && expenseConcepto.trim()) ? "btn-active-effect" : ""}
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        background: loading ? '#ccc' : (expenseMonto > 0 && expenseConcepto.trim() ? '#ff9800' : '#ddd'),
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: '900',
                                        marginTop: '10px',
                                        cursor: (loading || expenseMonto <= 0 || !expenseConcepto.trim()) ? 'not-allowed' : 'pointer',
                                        opacity: (expenseMonto > 0 && expenseConcepto.trim()) ? 1 : 0.6,
                                        fontSize: '16px'
                                    }}
                                >
                                    {loading ? <RefreshCw className="spin" size={16} /> : 'REGISTRAR GASTO'}
                                </button>
                            </div>
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
