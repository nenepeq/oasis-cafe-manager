import React from 'react';
import { X, RefreshCw, Download } from 'lucide-react';
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
    updateSaleStatus
}) => {
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
        worksheet.getCell('G2').value = `Total: $${totalIngresosReporte.toFixed(2)}`;
        worksheet.getRow(2).font = { bold: true };

        const rows = sales.map(s => {
            let statusText = '';
            if (s.status === 'entregado') statusText = '✅ ENTREGADO';
            else if (s.status === 'cancelado') statusText = '❌ CANCELADO';
            else statusText = '⏳ PENDIENTE DE ENTREGAR';

            return [
                `#${s.id.slice(0, 4).toUpperCase()}`,
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
        worksheet.getCell(totalRow.number, 5).value = 'TOTAL:';
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
                style={{
                    position: 'relative',
                    backgroundColor: '#fff',
                    padding: '20px',
                    borderRadius: '20px',
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
                        {sales.length > 0 && (
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

                    <div style={{ marginLeft: 'auto', fontWeight: '900', fontSize: '18px', color: '#27ae60' }}>
                        Total: ${totalIngresosReporte.toFixed(2)}
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
                        ) : sales.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No hay ventas en este rango</div>
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
                                    {sales.map(sale => (
                                        <tr
                                            key={sale.id}
                                            onClick={() => setSelectedSale(sale)}
                                            style={{
                                                borderBottom: '1px solid #eee',
                                                cursor: 'pointer',
                                                backgroundColor: selectedSale?.id === sale.id ? '#f0f8ff' : 'transparent',
                                                opacity: sale.status === 'cancelado' ? 0.6 : 1
                                            }}
                                        >
                                            <td style={{ padding: '10px', color: '#000' }}>
                                                {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '10px', color: '#000' }}>
                                                {sale.customer_name}
                                                {sale.payment_method && <div style={{ fontSize: '10px', color: '#666' }}>{sale.payment_method}</div>}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right', color: sale.status === 'cancelado' ? '#ccc' : '#27ae60', fontWeight: '900' }}>
                                                ${sale.total}
                                                {sale.status === 'cancelado' && <div style={{ fontSize: '10px', color: '#e74c3c' }}>CANCELADO</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {selectedSale && (
                        <div style={{ flex: 1, backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                            <h3 style={{ marginTop: 0, color: '#000', fontSize: '16px' }}>
                                Nota #{selectedSale.id.slice(0, 4)}
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    {new Date(selectedSale.created_at).toLocaleDateString()} · {new Date(selectedSale.created_at).toLocaleTimeString()}
                                </div>
                            </h3>
                            <div style={{ marginBottom: '10px', color: '#000', fontSize: '13px' }}>
                                {selectedSale.sale_items?.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>{item.products?.name} {item.quantity} x ${item.price}</span>
                                        <span style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '16px', color: '#000' }}>
                                <span>Total</span>
                                <span>${selectedSale.total}</span>
                            </div>
                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedSale.status === 'recibido' && (
                                    <button
                                        onClick={() => updateSaleStatus(selectedSale.id, 'entregado')}
                                        style={{ padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        MARCAR ENTREGADO
                                    </button>
                                )}
                                {userRole === 'admin' && selectedSale.status !== 'cancelado' && (
                                    <button
                                        onClick={() => { if (window.confirm('¿Estás seguro de cancelar esta venta?')) updateSaleStatus(selectedSale.id, 'cancelado'); }}
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
