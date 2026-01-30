import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, RefreshCw, Download, Banknote, CreditCard, Clock, Calendar, Search, Check, MapPin, DollarSign, Filter, Trophy, Target, TrendingUp, Award } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Modal de Historial de Ventas y Detalles de Pedido
 */
const SalesModal = ({
    showReport,
    setShowReport,
    setSelectedSale,
    reportStartDate,
    setReportStartDate,
    reportEndDate,
    setReportEndDate,
    fetchSales,
    totalIngresosReporte,
    loading,
    sales,
    selectedSale,
    userRole,
    updateSaleStatus,
    markAsPaid,
    pendingSales = [],
    hasMoreSales,
    loadMoreSales,
    salesGoal,
    setSalesGoal,
    monthlySalesTotal = 0
}) => {
    const [activeTab, setActiveTab] = useState('pagadas'); // 'pagadas' | 'por_cobrar' | 'config'
    const [localSalesGoal, setLocalSalesGoal] = useState(salesGoal);
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    // Sync local state when prop changes (e.g., initial load from Supabase)
    useEffect(() => {
        setLocalSalesGoal(salesGoal);
    }, [salesGoal]);

    const handleSaveGoal = async () => {
        setIsSavingGoal(true);
        try {
            const result = await setSalesGoal(localSalesGoal);
            if (result && !result.success) throw result.error;
            alert('✅ Meta de ventas actualizada correctamente');
        } catch (err) {
            alert('❌ Error al guardar la meta: ' + err.message);
        } finally {
            setIsSavingGoal(false);
        }
    };
    const [debts, setDebts] = useState([]);
    // ... (rest of initial implementation)
    const [loadingDebts, setLoadingDebts] = useState(false);

    // Fetch DEBTS individually to ensure they are always up to date and ignore date filters
    useEffect(() => {
        if (activeTab === 'por_cobrar' && showReport) {
            const fetchDebts = async () => {
                setLoadingDebts(true);
                try {
                    const { data, error } = await supabase
                        .from('sales')
                        .select(`*, sale_items (*, products (name, sale_price))`)
                        .eq('payment_method', 'A Cuenta')
                        .neq('status', 'cancelado')
                        .order('created_at', { ascending: false });

                    if (!error) {
                        setDebts(data || []);
                    }
                } catch (err) {
                    console.error("Error fetching debts:", err);
                } finally {
                    setLoadingDebts(false);
                }
            };
            fetchDebts();
        }
    }, [activeTab, showReport]);

    // Auto-switch tab if offline is active but becomes empty
    useEffect(() => {
        if (activeTab === 'offline' && pendingSales.length === 0) {
            setActiveTab('pagadas');
        }
    }, [pendingSales.length, activeTab]);

    const handleExportSalesCSV = async () => {
        if (!sales || sales.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte de Ventas');

        // Estilos
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };
        const headerFont = { name: 'Arial Black', size: 10, color: { argb: 'FFFFFFFF' } };
        const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

        worksheet.mergeCells('A1:G1');
        const mainHeader = worksheet.getCell('A1');
        mainHeader.value = 'OASIS CAFÉ - REPORTE DE VENTAS';
        mainHeader.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } };
        mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        mainHeader.fill = headerFill;

        worksheet.getCell('A2').value = `Periodo: ${reportStartDate} al ${reportEndDate}`;
        worksheet.getCell('G2').value = `Total Ingresos: $${totalIngresosReporte.toFixed(2)}`;
        worksheet.getRow(2).font = { bold: true };

        const rows = sales.map(s => {
            let statusText = '';
            if (s.status === 'entregado') statusText = '✅ ENTREGADO';
            else if (s.status === 'cancelado') statusText = '❌ CANCELADO';
            else statusText = '⏳ PENDIENTE DE ENTREGAR';

            return [
                s.ticket_number ? `#${s.ticket_number}` : (s.id ? `#${s.id.slice(0, 4).toUpperCase()}` : 'N/A'),
                new Date(s.created_at).toLocaleString(),
                s.customer_name,
                s.sale_items?.map(item => `${item.quantity}x ${item.products?.name || 'Producto'}`).join(' | ') || '',
                s.payment_method || '',
                s.total,
                statusText
            ];
        });

        worksheet.addTable({
            name: 'SalesTable',
            ref: 'A4',
            headerRow: true,
            style: { theme: 'TableStyleMedium11', showRowStripes: true },
            columns: [
                { name: 'Ticket', filterButton: true },
                { name: 'Fecha', filterButton: true },
                { name: 'Cliente', filterButton: true },
                { name: 'Productos', filterButton: false },
                { name: 'Método', filterButton: true },
                { name: 'Total', filterButton: false },
                { name: 'Estado', filterButton: true }
            ],
            rows: rows,
        });

        // Formatear columna de Total como moneda
        rows.forEach((_, idx) => {
            const cell = worksheet.getCell(idx + 5, 6);
            cell.numFmt = '"$"#,##0.00';
        });

        // Fila de Total
        const totalRow = worksheet.addRow([]);
        const totalCell = worksheet.getCell(totalRow.number, 6);
        totalCell.value = totalIngresosReporte;
        totalCell.numFmt = '"$"#,##0.00';
        totalCell.font = { bold: true, size: 12 };
        worksheet.getCell(totalRow.number, 5).value = 'TOTAL INGRESOS:';
        worksheet.getCell(totalRow.number, 5).font = { bold: true };

        worksheet.getColumn(1).width = 10;
        worksheet.getColumn(2).width = 20;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 40;
        worksheet.getColumn(5).width = 15;
        worksheet.getColumn(6).width = 15;
        worksheet.getColumn(7).width = 12;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Reporte_Ventas_Oasis_${reportStartDate}.xlsx`);
    };

    if (!showReport) return null;

    // LÓGICA DE FILTRADO
    let filteredSales = [];
    if (activeTab === 'offline') {
        filteredSales = pendingSales;
    } else if (activeTab === 'por_cobrar') {
        filteredSales = debts;
    } else if (activeTab === 'config') {
        filteredSales = []; // No sales in config tab
    } else {
        filteredSales = sales.filter(s => s.payment_method !== 'A Cuenta');
    }

    // SINGLE SOURCE OF TRUTH:
    // En lugar de usar 'selectedSale' directamente (que puede tener datos viejos),
    // buscamos la versión más reciente de esa venta en la lista 'sales' actualizada.
    // Si no se encuentra (ej. filtrado excesivo), usamos selectedSale como fallback o null.
    const activeSale = selectedSale
        ? (activeTab === 'offline'
            ? pendingSales.find(s => s.id === selectedSale.id)
            : sales.find(s => s.id === selectedSale.id)) || selectedSale
        : null;

    const totalFiltered = filteredSales.reduce((acc, s) => acc + (s.status !== 'cancelado' ? s.total : 0), 0);

    return (
        <div
            onClick={() => { setShowReport(false); setSelectedSale(null); }}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative', backgroundColor: '#fff', padding: '25px', borderRadius: '25px',
                    width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}
            >
                <button
                    onClick={() => { setShowReport(false); setSelectedSale(null); }}
                    style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: '0 0 25px 0', fontSize: '22px', paddingRight: '40px' }}>Reporte de Ventas</h2>

                {/* TABS SELECTOR */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '5px', background: '#f5f5f5', borderRadius: '15px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { setActiveTab('pagadas'); setSelectedSale(null); }}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                            background: activeTab === 'pagadas' ? '#4a3728' : 'transparent',
                            color: activeTab === 'pagadas' ? '#fff' : '#4a3728',
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                            fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                    >
                        ✅ PAGADAS
                    </button>
                    <button
                        onClick={() => { setActiveTab('por_cobrar'); setSelectedSale(null); }}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                            background: activeTab === 'por_cobrar' ? '#e67e22' : 'transparent',
                            color: activeTab === 'por_cobrar' ? '#fff' : '#e67e22',
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                            fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>⏳</span> POR COBRAR ({debts.length})
                    </button>
                    {pendingSales.length > 0 && (
                        <button
                            onClick={() => { setActiveTab('offline'); setSelectedSale(null); }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                                background: activeTab === 'offline' ? '#f1c40f' : 'transparent',
                                color: activeTab === 'offline' ? '#fff' : '#f1c40f',
                                fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                        >
                            📶 OFFLINE ({pendingSales.length})
                        </button>
                    )}
                    {userRole === 'admin' && (
                        <button
                            onClick={() => { setActiveTab('config'); setSelectedSale(null); }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                                background: activeTab === 'config' ? '#3498db' : 'transparent',
                                color: activeTab === 'config' ? '#fff' : '#3498db',
                                fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                                fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                        >
                            <Trophy size={14} /> METAS
                        </button>
                    )}
                </div>

                {/* RESUMEN RÁPIDO (KPIs) - Solo se muestra en pestañas de ventas */}
                {activeTab !== 'config' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        {/* TOTAL ACUMULADO DEL MES */}
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1.5px solid #bbf7d0', padding: '15px', borderRadius: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', marginBottom: '5px' }}>
                                <TrendingUp size={16} />
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>INGRESOS ACUMULADOS (MES)</span>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d' }}>
                                ${monthlySalesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '10px', color: '#166534', marginTop: '4px', fontWeight: 'bold' }}>
                                {new Date().toLocaleString('es-MX', { month: 'long' }).toUpperCase()} {new Date().getFullYear()}
                            </div>
                        </div>

                        {/* PROGRESO META MENSUAL */}
                        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', padding: '15px', borderRadius: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', marginBottom: '12px' }}>
                                <span style={{ fontSize: '18px' }}>🎯</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>META MENSUAL</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '26px', fontWeight: '900', color: '#1f2937' }}>
                                    ${monthlySalesTotal.toLocaleString()}
                                </span>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                    de ${parseFloat(salesGoal || 0).toLocaleString()}
                                </span>
                            </div>

                            <div style={{ fontSize: '20px', fontWeight: '900', color: '#3b82f6', marginBottom: '10px' }}>
                                {((monthlySalesTotal / (salesGoal || 1)) * 100).toFixed(0)}% Alcanzado
                            </div>

                            <div style={{ width: '100%', height: '10px', background: '#f3f4f6', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                                <div style={{
                                    width: `${Math.min((monthlySalesTotal / (salesGoal || 1)) * 100, 100)}%`,
                                    height: '100%',
                                    backgroundColor: monthlySalesTotal >= salesGoal ? '#10b981' : '#3b82f6',
                                    transition: 'width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}></div>
                            </div>

                            <div style={{ fontSize: '12px', color: '#4b5563', fontWeight: '500' }}>
                                {monthlySalesTotal >= salesGoal
                                    ? '✅ ¡OBJETIVO MENSUAL LOGRADO!'
                                    : `Nos falta vender: $${Math.max(0, salesGoal - monthlySalesTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && userRole === 'admin' ? (
                    <div style={{ padding: '20px', background: '#f9fbfd', borderRadius: '15px', border: '1px solid #e1e8ed' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ padding: '10px', background: '#3498db', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={20} color="#fff" />
                            </div>
                            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>METAS</h3>
                        </div>

                        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <Target size={20} style={{ color: '#3498db' }} />
                                <span style={{ fontWeight: 'bold', color: '#34495e' }}>Meta de Ventas Mensual</span>
                            </div>

                            <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '15px', lineHeight: '1.4' }}>
                                Define el objetivo de ventas brutas para el mes actual. Este valor se utilizará en los indicadores de rendimiento del dashboard.
                            </p>

                            <div style={{
                                display: 'flex',
                                flexDirection: window.innerWidth < 600 ? 'column' : 'row',
                                alignItems: 'stretch',
                                gap: '15px'
                            }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#95a5a6' }} />
                                    <input
                                        type="number"
                                        value={localSalesGoal}
                                        onChange={(e) => setLocalSalesGoal(parseFloat(e.target.value) || 0)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 35px',
                                            borderRadius: '10px',
                                            border: '2px solid #3498db',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            outline: 'none',
                                            color: '#2c3e50'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSaveGoal}
                                    disabled={isSavingGoal}
                                    style={{
                                        padding: '15px 25px',
                                        background: '#3498db',
                                        color: '#fff',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        cursor: isSavingGoal ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 6px rgba(52, 152, 219, 0.2)',
                                        fontSize: '14px'
                                    }}
                                >
                                    {isSavingGoal ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                                    {isSavingGoal ? 'GUARDANDO...' : 'GUARDAR META'}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', background: '#fffbea', borderRadius: '10px', border: '1px solid #ffe58f', display: 'flex', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>💡</span>
                            <p style={{ margin: 0, fontSize: '12px', color: '#856404', lineHeight: '1.4' }}>
                                <strong>Consejo:</strong> Una meta realista motiva a tu equipo. Puedes ajustar este valor en cualquier momento y los cambios se verán reflejados inmediatamente en el dashboard de finanzas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* FILTRO DE FECHA (RANGO) */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>DESDE:</span>
                                <input
                                    type="date"
                                    value={reportStartDate}
                                    onChange={(e) => setReportStartDate(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888' }}>HASTA:</span>
                                <input
                                    type="date"
                                    value={reportEndDate}
                                    onChange={(e) => setReportEndDate(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignSelf: 'flex-end' }}>
                                {sales.length > 0 && activeTab === 'pagadas' && (
                                    <button
                                        onClick={handleExportSalesCSV}
                                        className="btn-active-effect"
                                        style={{
                                            padding: '10px 15px', background: '#27ae60', color: '#fff',
                                            border: 'none', borderRadius: '10px', fontWeight: 'bold',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                                            boxShadow: '0 4px 0 #1e7e46'
                                        }}
                                    >
                                        <Download size={18} /> EXCEL
                                    </button>
                                )}
                                <div style={{ textAlign: 'right', fontWeight: '900', fontSize: '18px', color: activeTab === 'pagadas' ? '#27ae60' : (activeTab === 'offline' ? '#f1c40f' : '#e67e22') }}>
                                    {activeTab === 'pagadas' ? 'Total Ingresos:' : (activeTab === 'offline' ? 'Total Offline:' : 'Total Pendiente:')}<br />
                                    ${totalFiltered.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {reportStartDate > reportEndDate && (
                            <div style={{
                                background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '10px',
                                marginBottom: '15px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #f5c6cb'
                            }}>
                                ⚠️ La fecha "Desde" no puede ser mayor a la fecha "Hasta".
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '20px' }}>
                            <div style={{ flex: 1, maxHeight: '350px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '15px' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Cargando ventas...</div>
                                ) : filteredSales.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hay ventas en esta sección</div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa', borderBottom: '1.5px solid #eee', position: 'sticky', top: 0, zIndex: 5 }}>
                                                <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Fecha/Hora</th>
                                                <th style={{ textAlign: 'left', padding: '12px', color: '#666' }}>Cliente</th>
                                                <th style={{ textAlign: 'right', padding: '12px', color: '#666' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSales.map(sale => (
                                                <tr
                                                    key={sale.id}
                                                    onClick={() => setSelectedSale(sale)}
                                                    style={{
                                                        borderBottom: '1px solid #eee',
                                                        cursor: 'pointer',
                                                        backgroundColor: activeSale?.id === sale.id ? '#e8f4fd' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: '500', color: '#2c3e50' }}>{new Date(sale.created_at || sale.timestamp).toLocaleDateString()}</div>
                                                        <div style={{ fontSize: '11px', color: '#95a5a6' }}>{new Date(sale.created_at || sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: '500', color: '#2c3e50' }}>{sale.customer_name}</div>
                                                        {sale.payment_method && <div style={{ fontSize: '11px', color: '#95a5a6' }}>{sale.payment_method}</div>}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        <div style={{ fontWeight: '900', color: sale.status === 'cancelado' ? '#bdc3c7' : '#27ae60' }}>
                                                            ${parseFloat(sale.total).toFixed(2)}
                                                        </div>
                                                        {sale.status === 'cancelado' && <div style={{ fontSize: '10px', color: '#e74c3c', fontWeight: 'bold' }}>CANCELADO</div>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {hasMoreSales && !loading && filteredSales.length > 0 && activeTab === 'pagadas' && (
                                    <button
                                        onClick={loadMoreSales}
                                        style={{
                                            width: '100%', padding: '12px', background: '#fff', color: '#3498db',
                                            border: 'none', borderTop: '1px solid #eee', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        ⬇️ Cargar más...
                                    </button>
                                )}
                            </div>

                            {activeSale && (
                                <div style={{ flex: 1, backgroundColor: '#fdfcfe', padding: '20px', borderRadius: '15px', border: '1.5px solid #f1f0f4', animation: 'fadeIn 0.3s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>Ticket #{activeSale.ticket_number || String(activeSale.id).slice(0, 4)}</h3>
                                            <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '4px' }}>
                                                {new Date(activeSale.created_at || activeSale.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold',
                                            backgroundColor: activeSale.status === 'cancelado' ? '#fdeaea' : '#eafaf1',
                                            color: activeSale.status === 'cancelado' ? '#e74c3c' : '#27ae60'
                                        }}>
                                            {activeSale.status?.toUpperCase() || 'ENTREGADO'}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        {(activeSale.items || activeSale.sale_items)?.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                                <span style={{ color: '#34495e' }}>{item.quantity}x {item.name || item.products?.name}</span>
                                                <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>${((item.sale_price || item.price) * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ borderTop: '2px solid #eee', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#7f8c8d' }}>TOTAL</span>
                                        <span style={{ fontWeight: '900', fontSize: '22px', color: '#27ae60' }}>${parseFloat(activeSale.total).toFixed(2)}</span>
                                    </div>

                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeTab === 'offline' && (
                                            <div style={{ padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #ffeeba' }}>
                                                ⚠️ Venta sin sincronizar
                                            </div>
                                        )}

                                        {activeSale.status === 'recibido' && activeSale.payment_method !== 'A Cuenta' && (
                                            <button
                                                onClick={() => updateSaleStatus(activeSale.id, 'entregado')}
                                                style={{ padding: '12px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                MARCAR ENTREGADO
                                            </button>
                                        )}

                                        {activeSale.payment_method === 'A Cuenta' && activeSale.status !== 'cancelado' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#e67e22', textAlign: 'center' }}>¿COBRAR DEUDA?</div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => markAsPaid(activeSale.id, 'Efectivo')} style={{ flex: 1, padding: '10px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <Banknote size={14} /> EFECTIVO
                                                    </button>
                                                    <button onClick={() => markAsPaid(activeSale.id, 'Tarjeta')} style={{ flex: 1, padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <CreditCard size={14} /> TARJETA
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {activeSale.status !== 'cancelado' && userRole === 'admin' && (
                                            <button
                                                onClick={() => { if (window.confirm('¿Cancelar esta venta?')) updateSaleStatus(activeSale.id, 'cancelado'); }}
                                                style={{ padding: '10px', backgroundColor: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', marginTop: '5px' }}
                                            >
                                                CANCELAR VENTA
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SalesModal;
