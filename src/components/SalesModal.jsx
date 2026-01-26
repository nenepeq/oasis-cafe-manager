import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Download, Banknote, CreditCard } from 'lucide-react';
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
    loadMoreSales
}) => {
    const [activeTab, setActiveTab] = useState('pagadas'); // 'pagadas' | 'por_cobrar'

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
                s.ticket_number ? `#${s.ticket_number}` : `#${s.id.slice(0, 4).toUpperCase()}`,
                new Date(s.created_at).toLocaleString(),
                s.customer_name,
                s.sale_items?.map(item => `${item.quantity}x ${item.products?.name || 'Producto'}`).join(' | ') || '',
                s.payment_method || '',
                s.total,
                statusText
            ];
        });

        worksheet.addTable({
            name: 'VentasDetalle',
            ref: 'A4',
            headerRow: true,
            style: {
                theme: 'TableStyleMedium6',
                showRowStripes: true,
            },
            columns: [
                { name: 'Folio', filterButton: true },
                { name: 'Fecha/Hora', filterButton: true },
                { name: 'Cliente', filterButton: true },
                { name: 'Productos', filterButton: false },
                { name: 'Método Pago', filterButton: true },
                { name: 'Total', filterButton: false },
                { name: 'Estatus', filterButton: true },
            ],
            rows: rows,
        });

        // Aplicar formatos a la tabla
        const startRow = 5;
        rows.forEach((sRow, idx) => {
            const rowNum = startRow + idx;
            const row = worksheet.getRow(rowNum);
            row.getCell(6).numFmt = '"$"#,##0.00';

            // Estilos específicos por estatus
            if (sRow[6] === '❌ CANCELADO') {
                row.font = { color: { argb: 'FF999999' }, italic: true };
                const statusCell = row.getCell(7);
                statusCell.font = { color: { argb: 'FFFF0000' }, bold: true, italic: true };
            } else if (sRow[6] === '⏳ PENDIENTE DE ENTREGAR') {
                const statusCell = row.getCell(7);
                statusCell.font = { color: { argb: 'FFCC7A00' }, bold: true }; // Un tono naranja/ámbar
            } else if (sRow[6] === '✅ ENTREGADO') {
                const statusCell = row.getCell(7);
                statusCell.font = { color: { argb: 'FF27AE60' }, bold: true };
            }
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
    const filteredSales = activeTab === 'offline'
        ? pendingSales
        : sales.filter(s => {
            if (activeTab === 'pagadas') {
                return s.payment_method !== 'A Cuenta';
            } else {
                // activeTab === 'por_cobrar'
                return s.payment_method === 'A Cuenta' && s.status !== 'cancelado';
            }
        });

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
                    padding: '20px',
                    // borderRadius: '20px', // Replaced by class
                    width: '95%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <button
                    onClick={() => { setShowReport(false); setSelectedSale(null); }}
                    style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#000000', zIndex: 10 }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ color: '#000000', fontWeight: '900', margin: '0 0 15px 0', fontSize: '20px', paddingRight: '40px' }}>Reporte de Ventas</h2>

                {/* TABS SELECTOR */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', padding: '5px', borderRadius: '15px', borderBottom: '2px solid var(--border-subtle)' }}>
                    <button
                        onClick={() => { setActiveTab('pagadas'); setSelectedSale(null); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none',
                            background: activeTab === 'pagadas' ? 'var(--bg-soft)' : 'transparent',
                            color: activeTab === 'pagadas' ? 'var(--color-accent)' : 'var(--color-primary)',
                            fontWeight: '900', cursor: 'pointer',
                            borderBottom: activeTab === 'pagadas' ? '3px solid var(--color-accent)' : '3px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            transition: 'all 0.2s'
                        }}
                    >
                        ✅ VENTAS COBRADAS
                    </button>
                    <button
                        onClick={() => { setActiveTab('por_cobrar'); setSelectedSale(null); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none',
                            background: activeTab === 'por_cobrar' ? 'var(--bg-soft)' : 'transparent',
                            color: activeTab === 'por_cobrar' ? 'var(--color-secondary)' : 'var(--color-primary)',
                            fontWeight: '900', cursor: 'pointer',
                            borderBottom: activeTab === 'por_cobrar' ? '3px solid var(--color-secondary)' : '3px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            transition: 'all 0.2s'
                        }}
                    >
                        ⏳ POR COBRAR
                    </button>
                    {pendingSales.length > 0 && (
                        <button
                            onClick={() => { setActiveTab('offline'); setSelectedSale(null); }}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '12px 12px 0 0', border: 'none',
                                background: activeTab === 'offline' ? 'var(--bg-soft)' : 'transparent',
                                color: activeTab === 'offline' ? 'var(--color-warning)' : 'var(--color-primary)',
                                fontWeight: '900', cursor: 'pointer',
                                borderBottom: activeTab === 'offline' ? '3px solid var(--color-warning)' : '3px solid transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                transition: 'all 0.2s'
                            }}
                        >
                            📶 OFFLINE ({pendingSales.length})
                        </button>
                    )}
                </div>

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
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                        {sales.length > 0 && activeTab === 'pagadas' && (
                            <button
                                onClick={handleExportSalesCSV}
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
                                    boxShadow: '0 4px 0 #1e7e46'
                                }}
                            >
                                <Download size={18} /> EXCEL
                            </button>
                        )}
                    </div>

                    <div style={{ marginLeft: 'auto', fontWeight: '900', fontSize: '18px', color: activeTab === 'pagadas' ? '#27ae60' : (activeTab === 'offline' ? '#f1c40f' : '#e67e22') }}>
                        {activeTab === 'pagadas' ? 'Total Ingresos:' : (activeTab === 'offline' ? 'Total Offline:' : 'Total Pendiente:')} ${totalFiltered.toFixed(2)}
                    </div>
                </div>

                {reportStartDate > reportEndDate && (
                    <div style={{
                        background: '#f8d7da',
                        color: '#721c24',
                        padding: '10px',
                        borderRadius: '10px',
                        marginBottom: '15px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        border: '1px solid #f5c6cb'
                    }}>
                        ⚠️ La fecha "Desde" no puede ser mayor a la fecha "Hasta".
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: window.innerWidth < 600 ? 'column' : 'row', gap: '20px' }}>
                    <div style={{ flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Cargando ventas...</div>
                        ) : filteredSales.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hay ventas en esta sección</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #000' }}>
                                        <th style={{ textAlign: 'left', padding: '8px', color: '#000' }}>Fecha/Hora</th>
                                        <th style={{ textAlign: 'left', padding: '8px', color: '#000' }}>Cliente</th>
                                        <th style={{ textAlign: 'right', padding: '8px', color: '#000' }}>Total</th>
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
                                                backgroundColor: activeSale?.id === sale.id ? '#f0f8ff' : 'transparent',
                                                opacity: sale.status === 'cancelado' ? 0.6 : 1
                                            }}
                                        >
                                            <td style={{ padding: '10px', color: '#000' }}>
                                                {new Date(sale.created_at || sale.timestamp).toLocaleDateString()} {new Date(sale.created_at || sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '10px', color: '#000' }}>
                                                {sale.customer_name}
                                                {sale.payment_method && <div style={{ fontSize: '10px', color: '#666' }}>{sale.payment_method}</div>}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right', color: sale.status === 'cancelado' ? '#ccc' : '#27ae60', fontWeight: '900' }}>
                                                ${parseFloat(sale.total).toFixed(2)}
                                                {sale.status === 'cancelado' && <div style={{ fontSize: '10px', color: '#e74c3c' }}>CANCELADO</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {hasMoreSales && !loading && filteredSales.length > 0 && activeTab !== 'offline' && (
                            <button
                                onClick={loadMoreSales}
                                className="btn-active-effect"
                                style={{
                                    width: '100%', padding: '15px', marginTop: '10px',
                                    background: '#f1f1f1', color: '#4a3728',
                                    border: '1px solid #ddd', borderRadius: '10px',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                ⬇️ CARGAR MÁS VENTAS ANTERIORES...
                            </button>
                        )}
                    </div>

                    {activeSale && (
                        <div style={{ flex: 1, backgroundColor: '#fffbf0', padding: '15px', borderRadius: '15px', border: '1px solid #f3e5d8' }}>
                            <h3 style={{ marginTop: 0, color: '#000', fontSize: '16px' }}>
                                Nota #{activeSale.ticket_number || String(activeSale.id).slice(0, 4)}
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    {new Date(activeSale.created_at || activeSale.timestamp).toLocaleDateString()} · {new Date(activeSale.created_at || activeSale.timestamp).toLocaleTimeString()}
                                </div>
                            </h3>
                            <div style={{ marginBottom: '10px', color: '#000', fontSize: '13px' }}>
                                {activeSale.items?.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>{item.name} {item.quantity} x ${parseFloat(item.sale_price).toFixed(2)}</span>
                                        <span style={{ fontWeight: 'bold' }}>${(item.sale_price * item.quantity).toFixed(2)}</span>
                                    </div>
                                )) || activeSale.sale_items?.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>{item.products?.name} {item.quantity} x ${parseFloat(item.price).toFixed(2)}</span>
                                        <span style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '16px', color: '#000' }}>
                                <span>Total</span>
                                <span>${parseFloat(activeSale.total).toFixed(2)}</span>
                            </div>
                            {activeTab === 'offline' && (
                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #ffeeba' }}>
                                    ⚠️ Esta venta aún no se ha sincronizado con el servidor.
                                </div>
                            )}
                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {activeSale.status === 'recibido' && activeSale.payment_method !== 'A Cuenta' && (
                                    <button
                                        onClick={() => updateSaleStatus(activeSale.id, 'entregado')}
                                        style={{ padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        MARCAR ENTREGADO
                                    </button>
                                )}

                                {/* BOTONES DE COBRAR (SOLO PARA 'A CUENTA') */}
                                {activeSale.payment_method === 'A Cuenta' && activeSale.status !== 'cancelado' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e67e22', textAlign: 'center' }}>
                                            ¿Cómo paga el cliente?
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`¿Cobrar $${activeSale.total} en EFECTIVO?`)) {
                                                        markAsPaid(activeSale.id, 'Efectivo');
                                                    }
                                                }}
                                                style={{ flex: 1, padding: '10px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                            >
                                                <Banknote size={16} /> EFECTIVO
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`¿Cobrar $${activeSale.total} con TARJETA?`)) {
                                                        markAsPaid(activeSale.id, 'Tarjeta');
                                                    }
                                                }}
                                                style={{ flex: 1, padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                            >
                                                <CreditCard size={16} /> TARJETA
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {userRole === 'admin' && activeSale.status !== 'cancelado' && (
                                    <button
                                        onClick={() => { if (window.confirm('¿Estás seguro de cancelar esta venta?')) updateSaleStatus(activeSale.id, 'cancelado'); }}
                                        style={{ padding: '10px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        CANCELAR VENTA
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesModal;
