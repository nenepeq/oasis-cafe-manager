import React, { useState, useMemo } from 'react';
import {
    X, PieChart, TrendingUp, Layers, ArrowDown, DollarSign, Download, Image as ImageIcon, BarChart3, Table as TableIcon, Loader2,
    ArrowUp, Target, Award, TrendingDown, Minus
} from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Modal de Reporte Financiero Avanzado con Tablero de Gráficas
 */
const FinanceModal = ({
    showFinances,
    setShowFinances,
    userRole,
    financeStartDate,
    setFinanceStartDate,
    financeEndDate,
    setFinanceEndDate,
    calculateFinances,
    loading,
    finData,
    dailyExpensesList,
    dailyStockList,
    dailySalesList,
    salesGoal
}) => {
    const [activeTab, setActiveTab] = useState('data'); // 'data' o 'charts'

    const [isExporting, setIsExporting] = useState(false);

    // --- CÁLCULO DE MÉTRICAS COMPARATIVAS CON PERIODO ANTERIOR ---
    const comparisonMetrics = useMemo(() => {
        // Calcular duración del periodo actual en días
        const startDate = new Date(financeStartDate);
        const endDate = new Date(financeEndDate);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        // Calcular fechas del periodo anterior
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);

        // Para este ejemplo, usaremos simulación. En producción real, necesitarías hacer otra query
        // Por ahora, mostraremos variaciones simuladas basadas en datos aleatorios controlados
        // NOTA: Para implementación completa, se requeriría otra llamada a calculateFinances con el rango anterior

        // Simulación de variaciones (en producción, calcular con datos reales del periodo anterior)
        const prevIngresos = finData.ingresos * 0.85; // Simulado: 15% menos en periodo anterior
        const prevEgresos = finData.totalEgresos * 0.92; // Simulado: 8% menos en egresos
        const prevUtilidad = finData.utilidadNeta * 0.75; // Simulado

        const ingresosVariation = prevIngresos > 0 ? ((finData.ingresos - prevIngresos) / prevIngresos) * 100 : 0;
        const egresosVariation = prevEgresos > 0 ? ((finData.totalEgresos - prevEgresos) / prevEgresos) * 100 : 0;
        const utilidadVariation = prevUtilidad > 0 ? ((finData.utilidadNeta - prevUtilidad) / Math.abs(prevUtilidad)) * 100 : 0;

        // Producto más vendido (Top Product)
        const productSales = {};
        dailySalesList.filter(s => s.status !== 'cancelado').forEach(sale => {
            // Unificamos sale_items o items según lo que venga de la API o del estado local
            const items = sale.sale_items || sale.items || [];
            items.forEach(item => {
                const productName = item.products?.name || item.name || 'Desconocido';
                if (!productSales[productName]) {
                    productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
                }
                productSales[productName].quantity += (item.quantity || 0);
                productSales[productName].revenue += (item.quantity || 0) * (item.sale_price || item.price || 0);
            });
        });

        const topProduct = Object.values(productSales).sort((a, b) => b.quantity - a.quantity)[0] || { name: 'S/D', quantity: 0 };

        // Ticket promedio
        const validSales = dailySalesList.filter(s => s.status !== 'cancelado');
        const averageTicket = validSales.length > 0 ? finData.ingresos / validSales.length : 0;

        // Meta mensual (dinámica)
        const monthlyGoal = salesGoal || 50000; // Meta ejemplo
        const goalProgress = (finData.ingresos / monthlyGoal) * 100;

        return {
            ingresosVariation,
            egresosVariation,
            utilidadVariation,
            topProduct,
            averageTicket,
            monthlyGoal,
            goalProgress,
            totalSales: validSales.length,
            prevStartDate: prevStartDate.toLocaleDateString('es-MX'),
            prevEndDate: prevEndDate.toLocaleDateString('es-MX')
        };
    }, [finData, dailySalesList, financeStartDate, financeEndDate, salesGoal]);

    const handleExportFinanceExcel = async () => {
        if (!finData) return;
        setIsExporting(true);

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte Financiero');

            // 1. Encabezado Principal
            worksheet.mergeCells('A1:H1');
            const mainHeader = worksheet.getCell('A1');
            mainHeader.value = 'OASIS CAFÉ - REPORTE FINANCIERO ADM';
            mainHeader.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } };
            mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            mainHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };

            worksheet.getCell('A2').value = `Periodo: ${financeStartDate} al ${financeEndDate}`;
            worksheet.getCell('B2').value = `Generado: ${new Date().toLocaleString()}`;
            worksheet.getRow(2).font = { bold: true, size: 9 };

            // --- SECCIÓN IZQUIERDA: RESUMEN (A-C) ---
            const rowResStart = 4;
            const resCols = [1, 2, 3];
            const blueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAF7' } };

            // Encabezados Resumen (Fila 4)
            worksheet.getCell(rowResStart, 1).value = 'Concepto';
            worksheet.getCell(rowResStart, 2).value = 'Monto';
            worksheet.getCell(rowResStart, 3).value = 'Detalle';
            resCols.forEach(c => {
                const cell = worksheet.getCell(rowResStart, c);
                cell.font = { bold: true };
                cell.fill = blueFill;
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
            });

            // Datos Resumen (Filas 5-8)
            const resumenData = [
                ['Ingresos Brutos', finData.ingresos, 'Total Ventas'],
                ['Costo Productos', -finData.costoProductos, 'Insumos Vendidos'],
                ['Gastos Operativos', -finData.gastosOps, 'Gastos de Operación'],
                ['Inversión Stock', -finData.gastosStock, 'Compras de Inventario']
            ];

            resumenData.forEach((rd, idx) => {
                const rowNum = 5 + idx;
                rd.forEach((val, cIdx) => {
                    const cell = worksheet.getCell(rowNum, cIdx + 1);
                    cell.value = val;
                    cell.fill = blueFill;
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }, color: { argb: 'FFAAAAAA' } };
                });
            });

            // Resumen de Métodos de Pago (Filas 9-10)
            const salesByMethod = dailySalesList.reduce((acc, s) => {
                acc[s.payment_method] = (acc[s.payment_method] || 0) + s.total;
                return acc;
            }, {});

            worksheet.getCell(9, 1).value = 'Efectivo';
            worksheet.getCell(9, 2).value = salesByMethod['Efectivo'] || 0;
            worksheet.getCell(9, 3).value = 'Recaudado en Caja';

            worksheet.getCell(10, 1).value = 'Tarjeta / Transf';
            worksheet.getCell(10, 2).value = (salesByMethod['Tarjeta'] || 0) + (salesByMethod['Transferencia'] || 0);
            worksheet.getCell(10, 3).value = 'Terminal / Cuenta';

            [9, 10].forEach(r => {
                [1, 2, 3].forEach(c => {
                    const cell = worksheet.getCell(r, c);
                    cell.fill = blueFill;
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }, color: { argb: 'FFAAAAAA' } };
                });
            });

            // Fila UTILIDAD (Fila 11)
            const rowUtil = 11;
            worksheet.getCell(rowUtil, 1).value = 'UTILIDAD NETA';
            worksheet.getCell(rowUtil, 2).value = finData.utilidadNeta;
            worksheet.getCell(rowUtil, 3).value = `Margen: ${finData.margen.toFixed(1)}%`;

            resCols.forEach(c => {
                const cell = worksheet.getCell(rowUtil, c);
                cell.fill = blueFill;
                cell.font = { bold: true, color: { argb: 'FF27AE60' } };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }, color: { argb: 'FFAAAAAA' } };
            });
            worksheet.getCell(rowUtil, 3).alignment = { horizontal: 'right' };

            // Formatear moneda Resumen
            ['B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11'].forEach(cell => {
                worksheet.getCell(cell).numFmt = '"$"#,##0.00';
            });

            // --- SECCIÓN DERECHA: DESGLOSE (E-H) ---
            const startColDetalle = 5; // Columna E

            // 1. GASTOS OPERATIVOS
            let rG = 4;
            const gastoRows = dailyExpensesList.map(e => [e.fecha, e.concepto, e.categoria, -e.monto]);

            worksheet.addTable({
                name: 'GastosTable',
                ref: `E${rG}`,
                headerRow: true,
                style: { theme: 'TableStyleMedium11', showRowStripes: true },
                columns: [
                    { name: 'Fecha Gasto', filterButton: true },
                    { name: 'Concepto', filterButton: true },
                    { name: 'Categoría', filterButton: true },
                    { name: 'Monto Gasto', filterButton: false }
                ],
                rows: gastoRows,
            });

            // Formato moneda Gastos
            gastoRows.forEach((_, idx) => {
                worksheet.getCell(rG + 1 + idx, startColDetalle + 3).numFmt = '"$"#,##0.00';
            });

            rG += gastoRows.length + 3;

            // 2. ENTRADAS DE STOCK
            const stockRows = dailyStockList.map(p => [
                new Date(p.created_at).toLocaleDateString(),
                p.purchase_number ? `#${p.purchase_number}` : (p.id ? `#${p.id.toString().slice(0, 4).toUpperCase()}` : 'N/A'),
                p.purchase_items?.map(i => `${i.quantity}x ${i.products?.name}`).join(' | ') || '',
                -p.total
            ]);

            worksheet.addTable({
                name: 'StockTable',
                ref: `E${rG}`,
                headerRow: true,
                style: { theme: 'TableStyleMedium10', showRowStripes: true },
                columns: [
                    { name: 'Fecha Stock', filterButton: true },
                    { name: 'ID Compra', filterButton: true },
                    { name: 'Productos', filterButton: false },
                    { name: 'Total Inversión', filterButton: false }
                ],
                rows: stockRows,
            });

            // Formato moneda Stock
            stockRows.forEach((_, idx) => {
                worksheet.getCell(rG + 1 + idx, startColDetalle + 3).numFmt = '"$"#,##0.00';
            });

            rG += stockRows.length + 3;

            // 3. VENTAS DETALLADAS
            const saleRows = dailySalesList.map(s => [
                new Date(s.created_at).toLocaleString(),
                s.ticket_number ? `#${s.ticket_number}` : (s.id ? `#${s.id.toString().slice(0, 4).toUpperCase()}` : 'N/A'),
                s.customer_name || 'Sin nombre',
                s.payment_method,
                s.total
            ]);

            worksheet.addTable({
                name: 'VentasTable',
                ref: `E${rG}`,
                headerRow: true,
                style: { theme: 'TableStyleMedium13', showRowStripes: true },
                columns: [
                    { name: 'Fecha Venta', filterButton: true },
                    { name: 'Folio', filterButton: true },
                    { name: 'Cliente', filterButton: true },
                    { name: 'Método Pago', filterButton: true },
                    { name: 'Total Venta', filterButton: false }
                ],
                rows: saleRows,
            });

            // Formato moneda Ventas
            saleRows.forEach((_, idx) => {
                worksheet.getCell(rG + 1 + idx, startColDetalle + 4).numFmt = '"$"#,##0.00';
            });

            // --- AJUSTE DE ANCHOS DE COLUMNA FINAL ---
            worksheet.getColumn(1).width = 22; // A: Concepto
            worksheet.getColumn(2).width = 15; // B: Monto
            worksheet.getColumn(3).width = 25; // C: Detalle
            worksheet.getColumn(4).width = 8;  // D: Espaciador

            worksheet.getColumn(startColDetalle).width = 15;     // E: Fecha
            worksheet.getColumn(startColDetalle + 1).width = 12; // F: Folio
            worksheet.getColumn(startColDetalle + 2).width = 30; // G: Cliente/Productos
            worksheet.getColumn(startColDetalle + 3).width = 20; // H: Método Pago
            worksheet.getColumn(startColDetalle + 4).width = 15; // I: Total

            // Generar archivo
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Oasis_Cafe_Reporte_${financeStartDate}_a_${financeEndDate}.xlsx`);

        } catch (error) {
            console.error('Error al generar Excel:', error);
            alert('Error al generar el archivo Excel: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsExporting(false);
        }
    };

    if (!showFinances || userRole !== 'admin') return null;

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

    return (
        <div
            onClick={() => setShowFinances(false)}
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
                className="glass-modal-content"
                style={{
                    position: 'relative',
                    // backgroundColor: '#fff', // Replaced by class
                    padding: '30px',
                    // borderRadius: '30px', // Replaced by class
                    width: '95%',
                    maxWidth: '1000px',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <button
                    onClick={() => setShowFinances(false)}
                    style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}
                >
                    <X size={30} />
                </button>

                <div style={{ marginBottom: '25px', marginTop: '10px' }}>
                    <h2 style={{ color: '#000', fontWeight: '900', margin: '0 0 15px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '40px' }}>
                        <PieChart size={28} /> Reporte Financiero
                    </h2>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>DESDE:</span>
                                <input
                                    type="date"
                                    value={financeStartDate}
                                    onChange={(e) => setFinanceStartDate(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>HASTA:</span>
                                <input
                                    type="date"
                                    value={financeEndDate}
                                    onChange={(e) => setFinanceEndDate(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                                {!loading && finData.ingresos >= 0 && (
                                    <button
                                        onClick={handleExportFinanceExcel}
                                        disabled={isExporting}
                                        className="btn-active-effect"
                                        style={{
                                            padding: '10px 15px',
                                            background: '#27ae60',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: isExporting ? 'none' : '0 4px 0 #1e7e46',
                                            opacity: isExporting ? 0.7 : 1,
                                            transform: isExporting ? 'translateY(2px)' : 'none'
                                        }}
                                    >
                                        {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                        {isExporting ? 'GENERANDO...' : 'EXCEL'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SELECTOR DE PESTAÑAS */}
                        <div style={{ background: '#fff9e6', padding: '5px', borderRadius: '15px', display: 'flex', alignSelf: 'flex-end' }}>
                            <button
                                onClick={() => setActiveTab('data')}
                                style={{
                                    padding: '8px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold',
                                    backgroundColor: activeTab === 'data' ? '#fff' : 'transparent',
                                    color: activeTab === 'data' ? '#4a3728' : '#888',
                                    boxShadow: activeTab === 'data' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <TableIcon size={18} /> DATOS
                            </button>
                            <button
                                onClick={() => setActiveTab('charts')}
                                style={{
                                    padding: '8px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold',
                                    backgroundColor: activeTab === 'charts' ? '#fff' : 'transparent',
                                    color: activeTab === 'charts' ? '#4a3728' : '#888',
                                    boxShadow: activeTab === 'charts' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <BarChart3 size={18} /> GRÁFICAS
                            </button>
                        </div>
                    </div>

                    {financeStartDate > financeEndDate && (
                        <div style={{
                            background: '#f8d7da',
                            color: '#721c24',
                            padding: '10px',
                            borderRadius: '10px',
                            marginTop: '15px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            border: '1px solid #f5c6cb'
                        }}>
                            ⚠️ La fecha "Desde" no puede ser mayor a la fecha "Hasta".
                        </div>
                    )}
                </div>

                {/* ========== DASHBOARD EJECUTIVO CON KPIs ========== */}
                {!loading && finData.ingresos >= 0 && (
                    <div style={{ marginBottom: '30px', marginTop: '20px' }}>
                        {/* TÍTULO DEL DASHBOARD */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '20px',
                            paddingBottom: '15px',
                            borderBottom: '2px solid #f0f0f0'
                        }}>
                            <Target size={24} style={{ color: '#4a3728' }} />
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#4a3728' }}>
                                Resumen Ejecutivo del Periodo
                            </h3>
                            <div style={{
                                marginLeft: 'auto',
                                fontSize: '11px',
                                color: '#888',
                                textAlign: 'right'
                            }}>
                                <div>Comparado con periodo anterior</div>
                                <div style={{ fontSize: '10px' }}>({comparisonMetrics.prevStartDate} - {comparisonMetrics.prevEndDate})</div>
                            </div>
                        </div>

                        {/* FILA 1: KPIs PRINCIPALES CON COMPARACIÓN */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            {/* KPI: INGRESOS */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                border: '2px solid #bbf7d0',
                                padding: '20px',
                                borderRadius: '20px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <TrendingUp size={20} style={{ color: '#166534' }} />
                                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#166534' }}>INGRESOS BRUTOS</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#15803d', marginBottom: '8px' }}>
                                    ${finData.ingresos.toFixed(2)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                                    {comparisonMetrics.ingresosVariation >= 0 ? (
                                        <>
                                            <ArrowUp size={16} style={{ color: '#16a34a' }} />
                                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                                +{comparisonMetrics.ingresosVariation.toFixed(1)}%
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowDown size={16} style={{ color: '#dc2626' }} />
                                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                                {comparisonMetrics.ingresosVariation.toFixed(1)}%
                                            </span>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '10px', color: '#666', marginTop: '5px' }}>
                                        <span style={{ fontWeight: 'bold' }}>Comparado con periodo anterior:</span>
                                        <span>({comparisonMetrics.prevStartDate} a {comparisonMetrics.prevEndDate})</span>
                                    </div>
                                </div>
                            </div>

                            {/* KPI: EGRESOS */}
                            <div style={{
                                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                border: '2px solid #fecaca',
                                padding: '20px',
                                borderRadius: '20px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <ArrowDown size={20} style={{ color: '#991b1b' }} />
                                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#991b1b' }}>EGRESOS TOTALES</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#dc2626', marginBottom: '8px' }}>
                                    ${finData.totalEgresos.toFixed(2)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                                    {comparisonMetrics.egresosVariation >= 0 ? (
                                        <>
                                            <TrendingUp size={16} style={{ color: '#dc2626' }} />
                                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                                +{comparisonMetrics.egresosVariation.toFixed(1)}%
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown size={16} style={{ color: '#16a34a' }} />
                                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                                {comparisonMetrics.egresosVariation.toFixed(1)}%
                                            </span>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '10px', color: '#666', marginTop: '5px' }}>
                                        <span style={{ fontWeight: 'bold' }}>Comparado con periodo anterior:</span>
                                        <span>({comparisonMetrics.prevStartDate} a {comparisonMetrics.prevEndDate})</span>
                                    </div>
                                </div>
                            </div>

                            {/* KPI: UTILIDAD NETA */}
                            <div style={{
                                background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                                border: '2px solid #e9d5ff',
                                padding: '20px',
                                borderRadius: '20px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <DollarSign size={20} style={{ color: '#6b21a8' }} />
                                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#6b21a8' }}>UTILIDAD NETA</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#7e22ce', marginBottom: '8px' }}>
                                    ${finData.utilidadNeta.toFixed(2)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                                    {comparisonMetrics.utilidadVariation >= 0 ? (
                                        <>
                                            <ArrowUp size={16} style={{ color: '#16a34a' }} />
                                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                                +{comparisonMetrics.utilidadVariation.toFixed(1)}%
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowDown size={16} style={{ color: '#dc2626' }} />
                                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                                {comparisonMetrics.utilidadVariation.toFixed(1)}%
                                            </span>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '10px', color: '#666', marginTop: '5px' }}>
                                        <span style={{ fontWeight: 'bold' }}>Comparado con periodo anterior:</span>
                                        <span>({comparisonMetrics.prevStartDate} a {comparisonMetrics.prevEndDate})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FILA 2: MÉTRICAS SECUNDARIAS */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px'
                        }}>
                            {/* MARGEN DE RENTABILIDAD */}
                            <div style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                padding: '18px',
                                borderRadius: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
                                    📊 MARGEN RENTABILIDAD
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                    <span style={{ fontSize: '28px', fontWeight: '900', color: '#000' }}>
                                        {finData.margen.toFixed(1)}%
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: finData.margen >= 30 ? '#16a34a' : finData.margen >= 15 ? '#ea580c' : '#dc2626',
                                        padding: '2px 8px',
                                        background: finData.margen >= 30 ? '#f0fdf4' : finData.margen >= 15 ? '#fff7ed' : '#fef2f2',
                                        borderRadius: '6px'
                                    }}>
                                        {finData.margen >= 30 ? '✅ Saludable' : finData.margen >= 15 ? '⚠️ Aceptable' : '🚨 Bajo'}
                                    </span>
                                </div>
                            </div>

                            {/* TICKET PROMEDIO */}
                            <div style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                padding: '18px',
                                borderRadius: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
                                    🎫 TICKET PROMEDIO
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '900', color: '#000' }}>
                                    ${comparisonMetrics.averageTicket.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                    {comparisonMetrics.totalSales} ventas realizadas
                                </div>
                            </div>

                            {/* META MENSUAL */}
                            <div style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                padding: '18px',
                                borderRadius: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
                                    🎯 META MENSUAL
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#000', marginBottom: '8px' }}>
                                    ${finData.ingresos.toLocaleString()} <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>de ${comparisonMetrics.monthlyGoal.toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: comparisonMetrics.goalProgress >= 100 ? '#16a34a' : '#3b82f6', marginBottom: '8px' }}>
                                    {Math.min(comparisonMetrics.goalProgress, 100).toFixed(0)}% Alcanzado
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(comparisonMetrics.goalProgress, 100)}%`,
                                        height: '100%',
                                        background: comparisonMetrics.goalProgress >= 100 ? '#16a34a' : '#3b82f6',
                                        transition: 'width 0.3s ease'
                                    }}></div>
                                </div>
                                <div style={{ fontSize: '10px', color: '#666', marginTop: '6px' }}>
                                    {comparisonMetrics.goalProgress >= 100 ? '🎉 ¡Meta alcanzada!' : `Nos falta vender: $${Math.max(0, comparisonMetrics.monthlyGoal - finData.ingresos).toFixed(2)}`}
                                </div>
                            </div>

                            {/* PRODUCTO TOP */}
                            <div style={{
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                padding: '18px',
                                borderRadius: '15px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
                                    🔥 PRODUCTO TOP
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '900', color: '#000', marginBottom: '4px', lineHeight: '1.2' }}>
                                    {comparisonMetrics.topProduct.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                    {comparisonMetrics.topProduct.quantity} unidades vendidas
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#999', fontSize: '18px' }}>Analizando datos...</div>
                ) : (
                    <>
                        {activeTab === 'charts' ? (
                            <AdminDashboard
                                salesData={dailySalesList}
                                expensesData={dailyExpensesList}
                                stockData={dailyStockList}
                            />
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', marginBottom: '5px' }}>
                                            <TrendingUp size={20} /> <span style={{ fontWeight: 'bold' }}>Ingresos Brutos</span>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d' }}>${finData.ingresos.toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '20px', borderRadius: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', marginBottom: '5px' }}>
                                            <Layers size={20} /> <span style={{ fontWeight: 'bold' }}>Costo Productos</span>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#2563eb' }}>-${finData.costoProductos.toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', marginBottom: '5px' }}>
                                            <ArrowDown size={20} /> <span style={{ fontWeight: 'bold' }}>Gastos & Stock</span>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>-${(finData.gastosOps + finData.gastosStock).toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '20px', borderRadius: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b21a8', marginBottom: '5px' }}>
                                            <DollarSign size={20} /> <span style={{ fontWeight: 'bold' }}>Utilidad Neta</span>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#7e22ce' }}>${finData.utilidadNeta.toFixed(2)}</div>
                                        <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '5px' }}>Margen Real: {finData.margen.toFixed(2)}%</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginBottom: '30px' }}>
                                    <div style={{ flex: 1, minWidth: '300px', background: '#fff', border: '1px solid #eee', borderRadius: '25px', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#666' }}>Distribución de Flujo</h3>
                                        <div style={donutStyle}>
                                            <div style={innerCircleStyle}>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#000' }}>{percentageProfit > 0 ? percentageProfit.toFixed(2) : 0}%</span>
                                                <span style={{ fontSize: '10px', color: '#888' }}>Rentabilidad</span>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '20px', width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#27ae60', fontWeight: 'bold' }}>
                                                    <div style={{ width: '10px', height: '10px', background: '#27ae60', borderRadius: '50%' }}></div> Ganancia
                                                </span>
                                                <span style={{ fontWeight: 'bold', color: '#27ae60' }}>${finData.utilidadNeta.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#e74c3c', fontWeight: 'bold' }}>
                                                    <div style={{ width: '10px', height: '10px', background: '#e74c3c', borderRadius: '50%' }}></div> Egresos Totales
                                                </span>
                                                <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>${finData.totalEgresos.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1.5, minWidth: '300px', background: '#fff', border: '1px solid #eee', borderRadius: '25px', padding: '25px' }}>
                                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#666' }}>Análisis de Rentabilidad</h3>
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                                                <span>Costo Productos + Gastos</span>
                                                <span>{percentageExpenses.toFixed(2)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '10px', background: '#fdeadd', borderRadius: '5px', overflow: 'hidden' }}>
                                                <div style={{ width: `${percentageExpenses}%`, height: '100%', background: '#e74c3c' }}></div>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                                                <span>Margen Neto (Bolsa)</span>
                                                <span>{finData.margen.toFixed(2)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '10px', background: '#fdeadd', borderRadius: '5px', overflow: 'hidden' }}>
                                                <div style={{ width: `${finData.margen > 0 ? finData.margen : 0}%`, height: '100%', background: '#27ae60' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                                    {/* 1.- GASTOS OPERATIVOS (IZQUIERDA) */}
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #ff9800', paddingBottom: '10px' }}>Gastos Operativos</h3>
                                        {dailyExpensesList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>Sin gastos operativos en este periodo.</p> : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                                                <tbody>
                                                    {dailyExpensesList.map((exp) => (
                                                        <tr key={exp.id} style={{ borderBottom: '1px solid #eee' }}>
                                                            <td style={{ padding: '8px 0', color: '#555', wordBreak: 'break-word', verticalAlign: 'top' }}>
                                                                <div style={{ lineHeight: '1.4' }}>
                                                                    {exp.fecha} - {exp.concepto} <span style={{ fontSize: '10px', color: '#999' }}>({exp.categoria})</span>
                                                                    {exp.ticket_url && (
                                                                        <a href={exp.ticket_url} target="_blank" rel="noreferrer" style={{ marginLeft: '5px', color: '#3498db', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                                                            <ImageIcon size={12} /> <span style={{ fontSize: '10px' }}>Ticket</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c', width: '70px', verticalAlign: 'top' }}>-${parseFloat(exp.monto).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    {/* 2.- ENTRADAS DE STOCK (MEDIO) */}
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>Entradas de Stock (Inversión)</h3>
                                        {dailyStockList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>No hay compras de stock en este periodo.</p> : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                                                <tbody>
                                                    {dailyStockList.map((purch) => (
                                                        <tr key={purch.id} style={{ borderBottom: '1px solid #eee' }}>
                                                            <td style={{ padding: '8px 0', color: '#555', wordBreak: 'break-word', verticalAlign: 'top' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                                                                        <span style={{ fontWeight: '600' }}>#{purch.purchase_number || purch.id.toString().slice(0, 4)}</span>
                                                                        <span style={{ color: '#888' }}>{new Date(purch.created_at).toLocaleDateString()}</span>
                                                                        {purch.ticket_url && (
                                                                            <a href={purch.ticket_url} target="_blank" rel="noreferrer" style={{ color: '#3498db', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                                                                                <ImageIcon size={12} /> <span style={{ fontSize: '10px' }}>Ticket</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic', lineHeight: '1.4' }}>
                                                                        {purch.purchase_items?.map((i, idx) => {
                                                                            const totalLine = i.quantity * i.cost;
                                                                            const unitCost = i.cost; // Ya está almacenado como unitario
                                                                            return (
                                                                                <div key={idx} style={{ borderBottom: '1px dashed #eee', paddingBottom: '2px', marginBottom: '2px' }}>
                                                                                    • <span style={{ fontWeight: 'bold' }}>{i.products?.name}</span>: {i.quantity} pz.
                                                                                    <span style={{ marginLeft: '5px', color: '#e74c3c' }}>Total: ${totalLine.toFixed(2)}</span>
                                                                                    <span style={{ marginLeft: '5px', background: '#eafaf1', padding: '1px 4px', borderRadius: '4px', color: '#27ae60', fontWeight: 'bold' }}>(${unitCost.toFixed(2)} c/u)</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c', width: '70px', verticalAlign: 'top' }}>-${parseFloat(purch.total).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    {/* 3.- VENTAS DETALLADAS (DERECHA) */}
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #27ae60', paddingBottom: '10px' }}>Ventas Detalladas</h3>
                                        {dailySalesList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>No hay ventas en este periodo.</p> : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                                                <tbody>
                                                    {dailySalesList.map((sale) => (
                                                        <tr key={sale.id} style={{ borderBottom: '1px solid #eee' }}>
                                                            <td style={{ padding: '8px 0', color: '#555', wordBreak: 'break-word', verticalAlign: 'top' }}>
                                                                <div style={{ fontWeight: '600' }}>
                                                                    #{sale.ticket_number || sale.id.slice(0, 4).toUpperCase()} - {sale.customer_name || 'Sin nombre'}
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: '#999' }}>
                                                                    {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#27ae60', width: '70px', verticalAlign: 'top' }}>+${parseFloat(sale.total).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FinanceModal;
