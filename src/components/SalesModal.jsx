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
    loading,
    sales,
    selectedSale,
    userRole,
    updateSaleStatus,
    markAsPaid,
    cancelOfflineSale,
    pendingSales = [],
    hasMoreSales,
    loadMoreSales,
    salesGoal,
    setSalesGoal,
    totalIngresosReporte,
    totalSalesCount
}) => {
    const [activeTab, setActiveTab] = useState('pagadas'); // 'pagadas' | 'por_cobrar' | 'config'
    const [localSalesGoal, setLocalSalesGoal] = useState(salesGoal);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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
    const [loadingDebts, setLoadingDebts] = useState(false);

    // Fetch DEBTS siempre que se abra el reporte para mostrar el contador actualizado
    useEffect(() => {
        if (showReport) {
            const fetchDebts = async () => {
                if (activeTab === 'por_cobrar') setLoadingDebts(true);

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
    }, [showReport, activeTab]);

    // Sincronizar cambios de estatus en la lista de deudas local
    useEffect(() => {
        if (selectedSale && activeTab === 'por_cobrar') {
            setDebts(prev => prev.map(d => d.id === selectedSale.id ? {
                ...d,
                status: selectedSale.status,
                payment_method: selectedSale.payment_method
            } : d));
        }
    }, [selectedSale?.status, selectedSale?.payment_method]);

    // Auto-switch tab if offline is active but becomes empty
    useEffect(() => {
        if (activeTab === 'offline' && pendingSales.length === 0) {
            setActiveTab('pagadas');
        }
    }, [pendingSales.length, activeTab]);

    const handleExportSalesExcel = async () => {
        setIsExporting(true);
        try {
            let query = supabase.from('sales')
                .select(`*, sale_items (*, products (name, sale_price))`)
                .order('created_at', { ascending: false });

            if (reportStartDate && reportEndDate) {
                const endDateObj = new Date(reportEndDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                const nextDayStr = endDateObj.toISOString().split('T')[0];
                query = query
                    .gte('created_at', reportStartDate + 'T06:00:00')
                    .lt('created_at', nextDayStr + 'T06:00:00');
            }

            const { data: allSales, error } = await query;
            if (error) throw error;
            if (!allSales || allSales.length === 0) {
                alert("No hay ventas para exportar en este rango.");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte de Ventas');

            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };

            worksheet.mergeCells('A1:G1');
            const mainHeader = worksheet.getCell('A1');
            mainHeader.value = 'OASIS CAFÉ - REPORTE DE VENTAS';
            mainHeader.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } };
            mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            mainHeader.fill = headerFill;

            worksheet.getCell('A2').value = `Periodo: ${reportStartDate} al ${reportEndDate}`;
            worksheet.getCell('G2').value = `Total Ingresos: $${totalIngresosReporte.toFixed(2)}`;
            worksheet.getRow(2).font = { bold: true };

            const rows = allSales.map(s => {
                let statusText = '';
                if (s.status === 'entregado') statusText = '✅ ENTREGADO';
                else if (s.status === 'cancelado') statusText = '❌ CANCELADO';
                else if (s.status === 'recibido') statusText = '⏳ RECIBIDO';
                else statusText = s.status?.toUpperCase() || 'PAGADO';

                return [
                    s.ticket_number ? `#${s.ticket_number}` : (s.id ? `#${s.id.slice(0, 4).toUpperCase()}` : 'N/A'),
                    new Date(s.created_at).toLocaleString('es-MX'),
                    s.customer_name || 'Mostrador',
                    (s.sale_items || s.items)?.map(item => `${item.quantity}x ${item.products?.name || item.name || 'Producto'}`).join(' | ') || '',
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

            rows.forEach((_, idx) => {
                const cell = worksheet.getCell(idx + 5, 6);
                cell.numFmt = '"$"#,##0.00';
            });

            const totalRow = worksheet.addRow([]);
            const totalCell = worksheet.getCell(totalRow.number, 6);
            totalCell.value = totalIngresosReporte;
            totalCell.numFmt = '"$"#,##0.00';
            totalCell.font = { bold: true, size: 12 };
            worksheet.getCell(totalRow.number, 5).value = 'TOTAL INGRESOS:';
            worksheet.getCell(totalRow.number, 5).font = { bold: true };

            worksheet.getColumn(1).width = 12;
            worksheet.getColumn(2).width = 25;
            worksheet.getColumn(3).width = 25;
            worksheet.getColumn(4).width = 45;
            worksheet.getColumn(5).width = 15;
            worksheet.getColumn(6).width = 15;
            worksheet.getColumn(7).width = 20;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Reporte_Ventas_Oasis_${reportStartDate}.xlsx`);
        } catch (err) {
            console.error("Error exportando excel:", err);
            alert("❌ Error al generar reporte: " + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    if (!showReport) return null;

    let filteredSales = [];
    if (activeTab === 'offline') {
        filteredSales = pendingSales;
    } else if (activeTab === 'por_cobrar') {
        filteredSales = debts;
    } else if (activeTab === 'config') {
        filteredSales = [];
    } else {
        filteredSales = sales.filter(s => s.payment_method !== 'A Cuenta');
    }

    const activeSale = selectedSale
        ? (activeTab === 'offline'
            ? pendingSales.find(s => s.id === selectedSale.id)
            : (activeTab === 'por_cobrar'
                ? debts.find(s => s.id === selectedSale.id)
                : sales.find(s => s.id === selectedSale.id))
        ) || selectedSale
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
                    position: 'relative', backgroundColor: 'var(--bg-secondary)', padding: '25px', borderRadius: '25px',
                    width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)'
                }}
            >
                <button
                    onClick={() => { setShowReport(false); setSelectedSale(null); }}
                    style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', zIndex: 10 }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ color: 'var(--text-primary)', fontWeight: '900', margin: '0 0 25px 0', fontSize: '22px', paddingRight: '40px' }}>Reporte de Ventas</h2>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '5px', background: 'var(--bg-primary)', borderRadius: '15px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { setActiveTab('pagadas'); setSelectedSale(null); }}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                            background: activeTab === 'pagadas' ? '#27ae60' : 'transparent',
                            color: activeTab === 'pagadas' ? '#fff' : '#27ae60',
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

                {activeTab === 'config' && userRole === 'admin' ? (
                    <div style={{ padding: '20px', background: 'var(--bg-primary)', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ padding: '10px', background: '#3498db', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={20} color="#fff" />
                            </div>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>METAS</h3>
                        </div>

                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <Target size={20} style={{ color: '#3498db' }} />
                                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Meta de Ventas Mensual</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '15px', lineHeight: '1.4' }}>
                                Define el objetivo de ventas brutas para el mes actual.
                            </p>
                            <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', alignItems: 'stretch', gap: '15px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-primary)' }} />
                                    <input
                                        type="number"
                                        value={localSalesGoal}
                                        onChange={(e) => setLocalSalesGoal(parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '12px 12px 12px 35px', borderRadius: '10px', border: '2px solid #3498db', fontSize: '18px', fontWeight: 'bold', outline: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <button
                                    onClick={handleSaveGoal}
                                    disabled={isSavingGoal}
                                    style={{ padding: '15px 25px', background: '#3498db', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: isSavingGoal ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
                                >
                                    {isSavingGoal ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                                    {isSavingGoal ? 'GUARDANDO...' : 'GUARDAR META'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {activeTab === 'pagadas' && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-primary)' }}>DESDE:</span>
                                        <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', colorScheme: 'dark' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-primary)' }}>HASTA:</span>
                                        <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', colorScheme: 'dark' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                                        <button onClick={handleExportSalesExcel} disabled={isExporting || sales.length === 0} style={{ padding: '10px 15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />} EXCEL
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div style={{ textAlign: 'right', fontWeight: '900', fontSize: '18px', color: activeTab === 'pagadas' ? '#27ae60' : (activeTab === 'offline' ? '#f1c40f' : '#e67e22'), marginLeft: 'auto' }}>
                                <div style={{ fontSize: '10px', opacity: 0.8 }}>{activeTab === 'pagadas' ? `${totalSalesCount} Ventas` : `${filteredSales.length} Movimientos`}</div>
                                <div style={{ fontSize: '12px' }}>{activeTab === 'pagadas' ? 'Total Ingresos:' : (activeTab === 'offline' ? 'Total Offline:' : 'Total Pendiente:')} Durante este período</div>
                                <div>${(activeTab === 'pagadas' ? totalIngresosReporte : totalFiltered).toFixed(2)}</div>
                            </div>
                        </div>

                        {reportStartDate > reportEndDate && activeTab === 'pagadas' && (
                            <div style={{ background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '10px', borderRadius: '10px', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #e74c3c' }}>
                                ⚠️ La fecha "Desde" no puede ser mayor a la fecha "Hasta".
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '20px' }}>
                            <div style={{ flex: 1, maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '15px', position: 'relative' }}>
                                {loading && filteredSales.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-primary)' }}>
                                        <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '10px' }} />
                                        <div>Buscando ventas...</div>
                                    </div>
                                ) : filteredSales.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-primary)' }}>Sin registros</div>
                                ) : (
                                    <>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-highlight)', borderBottom: '1.5px solid var(--border-color)' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-primary)' }}>Fecha</th>
                                                    <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-primary)' }}>Cliente</th>
                                                    <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-primary)' }}>Estado</th>
                                                    <th style={{ textAlign: 'right', padding: '12px', color: 'var(--text-primary)' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredSales.map(sale => (
                                                    <tr key={sale.id} onClick={() => setSelectedSale(sale)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: activeSale?.id === sale.id ? 'var(--bg-highlight)' : 'transparent', opacity: sale.status === 'cancelado' ? 0.6 : 1 }}>
                                                        <td style={{ padding: '12px' }}>{new Date(sale.created_at || sale.timestamp).toLocaleString()}</td>
                                                        <td style={{ padding: '12px' }}>{sale.customer_name}</td>
                                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                                {sale.status === 'cancelado' ? (
                                                                    <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', fontSize: '9px', fontWeight: 'bold', border: '1px solid #e74c3c' }}>CANCELADA</span>
                                                                ) : (
                                                                    <>
                                                                        <span style={{ color: sale.payment_method === 'A Cuenta' ? '#e67e22' : '#27ae60', fontSize: '10px', fontWeight: 'bold' }}>
                                                                            {sale.payment_method === 'A Cuenta' ? 'A CUENTA' : 'PAGADA'}
                                                                        </span>
                                                                        <span style={{
                                                                            padding: '2px 6px',
                                                                            borderRadius: '8px',
                                                                            backgroundColor: sale.status === 'entregado' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                                                                            color: sale.status === 'entregado' ? '#27ae60' : '#e74c3c',
                                                                            fontSize: '9px',
                                                                            fontWeight: '900',
                                                                            border: sale.status === 'entregado' ? '1px solid #27ae60' : '1px solid #e74c3c'
                                                                        }}>
                                                                            {sale.status === 'entregado' ? 'ENTREGADO' : 'NO ENTREGADO'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>${parseFloat(sale.total).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Pagination Button for 'pagadas' tab */}
                                        {activeTab === 'pagadas' && hasMoreSales && (
                                            <div style={{ padding: '15px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                                                <button
                                                    onClick={loadMoreSales}
                                                    disabled={loading}
                                                    style={{
                                                        padding: '8px 20px',
                                                        background: '#3498db',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        margin: '0 auto'
                                                    }}
                                                >
                                                    {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                                                    {loading ? 'CARGANDO...' : 'MOSTRAR MÁS VENTAS'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {activeSale && (
                                <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '15px', border: '1.5px solid var(--border-color)' }}>
                                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Detalle Ticket #{activeSale.ticket_number || String(activeSale.id).slice(0, 4)}</h3>
                                    <div style={{ margin: '15px 0' }}>
                                        {(activeSale.items || activeSale.sale_items)?.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                                <span style={{ color: 'var(--text-primary)' }}>{item.quantity}x {item.name || item.products?.name}</span>
                                                <span style={{ color: 'var(--text-primary)' }}>${((item.sale_price || item.price) * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span style={{ color: 'var(--text-primary)' }}>TOTAL</span>
                                        <span style={{ color: '#27ae60', fontSize: '18px' }}>${parseFloat(activeSale.total).toFixed(2)}</span>
                                    </div>
                                    <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--text-primary)', opacity: 0.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div><strong>Método:</strong> {activeSale.payment_method}</div>
                                        <div style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: activeSale.status === 'entregado' ? '#27ae60' : (activeSale.status === 'cancelado' ? '#e74c3c' : '#e74c3c'),
                                            color: '#fff',
                                            fontSize: '10px',
                                            fontWeight: 'bold'
                                        }}>
                                            {activeSale.status === 'entregado' ? 'ENTREGADO' : (activeSale.status === 'cancelado' ? 'CANCELADO' : 'NO ENTREGADO')}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeSale.status !== 'cancelado' && (
                                            <button
                                                onClick={() => activeSale.status !== 'entregado' && updateSaleStatus(activeSale.id, 'entregado')}
                                                disabled={activeSale.status === 'entregado'}
                                                style={{
                                                    padding: '12px',
                                                    background: activeSale.status === 'entregado' ? 'var(--bg-primary)' : '#3498db',
                                                    color: activeSale.status === 'entregado' ? 'var(--text-primary)' : '#fff',
                                                    border: activeSale.status === 'entregado' ? '1px solid var(--border-color)' : 'none',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold',
                                                    cursor: activeSale.status === 'entregado' ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    opacity: activeSale.status === 'entregado' ? 0.7 : 1,
                                                    boxShadow: activeSale.status === 'entregado' ? 'none' : '0 4px 10px rgba(52, 152, 219, 0.3)'
                                                }}
                                            >
                                                <Check size={18} /> {activeSale.status === 'entregado' ? 'ENTREGAR PEDIDO' : 'ENTREGAR PEDIDO'}
                                            </button>
                                        )}
                                        {activeSale.payment_method === 'A Cuenta' && activeSale.status !== 'cancelado' && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => markAsPaid(activeSale.id, 'Efectivo')} style={{ flex: 1, padding: '10px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>COBRAR EFECTIVO</button>
                                                <button onClick={() => markAsPaid(activeSale.id, 'Tarjeta')} style={{ flex: 1, padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>COBRAR TARJETA</button>
                                            </div>
                                        )}
                                        {userRole === 'admin' && activeSale.status !== 'cancelado' && (
                                            <button
                                                onClick={() => {
                                                    if (activeTab === 'offline') {
                                                        cancelOfflineSale(activeSale.id);
                                                    } else {
                                                        if (window.confirm('¿Confirmas cancelar esta venta?')) {
                                                            updateSaleStatus(activeSale.id, 'cancelado');
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    padding: '10px',
                                                    color: '#e74c3c',
                                                    border: '1px solid #e74c3c',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: 'none',
                                                    fontWeight: 'bold',
                                                    marginTop: '10px'
                                                }}
                                            >
                                                {activeTab === 'offline' ? 'ELIMINAR VENTA OFFLINE' : 'CANCELAR VENTA'}
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
