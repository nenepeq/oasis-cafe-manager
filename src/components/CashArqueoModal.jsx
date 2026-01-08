import React from 'react';
import { Banknote, List, X, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Modal de Arqueo de Caja y Historial de Turnos
 */
const CashArqueoModal = ({
    showCashArqueo,
    setShowCashArqueo,
    userRole,
    fetchArqueoHistory,
    cashInitialFund,
    setCashInitialFund,
    cashReportData,
    cashPhysicalCount,
    setCashPhysicalCount,
    cashObservations,
    setCashObservations,
    handleOpenShift,
    handleCloseShift,
    activeShift,
    loading,
    showArqueoHistory,
    setShowArqueoHistory,
    arqueoHistory
}) => {

    const handleExportHistoryCSV = async () => {
        if (!arqueoHistory || arqueoHistory.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Historial de Turnos');

        // Estilo de encabezado
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };
        const headerFont = { name: 'Arial Black', size: 10, color: { argb: 'FFFFFFFF' } };

        worksheet.mergeCells('A1:I1');
        const mainHeader = worksheet.getCell('A1');
        mainHeader.value = 'OASIS CAFÉ - HISTORIAL DE TURNOS';
        mainHeader.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } };
        mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        mainHeader.fill = headerFill;

        const rows = arqueoHistory.map(h => [
            new Date(h.start_time).toLocaleString(),
            h.end_time ? new Date(h.end_time).toLocaleString() : 'En curso',
            h.initial_fund,
            h.sales_cash || 0,
            h.expenses_cash || 0,
            h.expected_cash || 0,
            h.actual_cash || 0,
            h.difference || 0,
            h.observations || ''
        ]);

        worksheet.addTable({
            name: 'HistorialTurnos',
            ref: 'A3',
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleMedium2',
                showRowStripes: true,
            },
            columns: [
                { name: 'Inicio', filterButton: true },
                { name: 'Fin', filterButton: true },
                { name: 'Fondo Inicial', filterButton: false },
                { name: 'Ventas Efectivo', filterButton: false },
                { name: 'Gastos Efectivo', filterButton: false },
                { name: 'Esperado', filterButton: false },
                { name: 'Real', filterButton: false },
                { name: 'Diferencia', filterButton: false },
                { name: 'Observaciones', filterButton: false },
            ],
            rows: rows,
        });

        // Aplicar formatos después de crear la tabla
        const startRow = 4;
        rows.forEach((h, idx) => {
            const rowNum = startRow + idx;
            const row = worksheet.getRow(rowNum);

            // Formato moneda
            [3, 4, 5, 6, 7, 8].forEach(col => {
                row.getCell(col).numFmt = '"$"#,##0.00';
            });

            // Color para diferencia
            const diffValue = h[7];
            const diffCell = row.getCell(8);
            if (diffValue < 0) diffCell.font = { color: { argb: 'FFFF0000' }, bold: true };
            else if (diffValue > 0) diffCell.font = { color: { argb: 'FF27AE60' }, bold: true };
        });

        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Historial_Turnos_Oasis.xlsx`);
    };

    const handleExportSingleArqueoCSV = async (h) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte de Turno');

        worksheet.mergeCells('A1:C1');
        const mainHeader = worksheet.getCell('A1');
        mainHeader.value = 'OASIS CAFÉ - REPORTE DE TURNO';
        mainHeader.font = { name: 'Arial Black', size: 12, color: { argb: 'FFFFFFFF' } };
        mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        mainHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };

        worksheet.addRow(['Inicio:', new Date(h.start_time).toLocaleString()]);
        worksheet.addRow(['Cierre:', h.end_time ? new Date(h.end_time).toLocaleString() : 'En curso']);
        worksheet.addRow([]);

        const dataHeaders = ['CONCEPTO', 'MONTO'];
        worksheet.addRow(dataHeaders);
        worksheet.getRow(5).font = { bold: true };

        const data = [
            ['Fondo Inicial', h.initial_fund],
            ['(+) Ventas Efectivo', h.sales_cash || 0],
            ['(-) Gastos Efectivo', -(h.expenses_cash || 0)],
            ['SALDO ESPERADO', h.expected_cash || 0],
            ['EFECTIVO FÍSICO', h.actual_cash || 0],
            ['DIFERENCIA', h.difference || 0]
        ];

        data.forEach((item, idx) => {
            const row = worksheet.addRow(item);
            row.getCell(2).numFmt = '"$"#,##0.00';
            if (idx === 3) row.font = { bold: true }; // Saldo esperado en negrita
            if (idx === 5) { // Diferencia
                row.font = { bold: true };
                if (item[1] < 0) row.getCell(2).font = { color: { argb: 'FFFF0000' } };
                else if (item[1] > 0) row.getCell(2).font = { color: { argb: 'FF27AE60' } };
            }
        });

        if (h.observations) {
            worksheet.addRow([]);
            worksheet.addRow(['OBSERVACIONES:', h.observations]);
        }

        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 15;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Reporte_Turno_${new Date(h.start_time).toLocaleDateString()}.xlsx`);
    };

    if (!showCashArqueo || userRole !== 'admin') return null;

    return (
        <>
            <div
                onClick={() => setShowCashArqueo(false)}
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
                    zIndex: 1200,
                    backdropFilter: 'blur(5px)'
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="modal-content-responsive"
                    style={{
                        position: 'relative',
                        backgroundColor: '#fff',
                        padding: '30px',
                        borderRadius: '30px',
                        width: '95%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Banknote size={30} color="#e67e22" />
                                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '24px' }}>
                                    {activeShift ? 'Turno Activo' : 'Abrir Turno'}
                                </h2>
                            </div>
                            <button
                                onClick={fetchArqueoHistory}
                                className="btn-active-effect"
                                style={{
                                    padding: '8px 16px',
                                    background: '#4a3728',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '900',
                                    cursor: 'pointer'
                                }}
                            >
                                <List size={14} /> HISTORIAL
                            </button>
                        </div>
                        <button
                            onClick={() => setShowCashArqueo(false)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#000' }}
                        >
                            <X size={30} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {!activeShift ? (
                            <div style={{ backgroundColor: '#fdfbf9', padding: '20px', borderRadius: '20px', border: '2px solid #e67e22' }}>
                                <label style={{ fontSize: '18px', fontWeight: 'bold', color: '#4a3728', display: 'block', marginBottom: '10px' }}>FONDO INICIAL DE CAJA ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={cashInitialFund || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setCashInitialFund(isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '24px', fontWeight: 'bold', backgroundColor: '#fff', color: '#333', marginBottom: '20px' }}
                                    placeholder="0.00"
                                    autoFocus
                                />
                                <button
                                    onClick={handleOpenShift}
                                    disabled={loading || cashInitialFund < 0}
                                    style={{
                                        width: '100%',
                                        padding: '18px',
                                        background: (loading || cashInitialFund < 0) ? '#ddd' : '#e67e22',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '15px',
                                        fontWeight: '900',
                                        cursor: (loading || cashInitialFund < 0) ? 'not-allowed' : 'pointer',
                                        fontSize: '18px'
                                    }}
                                >
                                    {loading ? 'ABRIENDO...' : 'ABRIR TURNO'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: '#f8f6f2', padding: '10px 15px', borderRadius: '12px', fontSize: '12px', color: '#4a3728', border: '1px solid #eee' }}>
                                    <strong>Iniciado:</strong> {new Date(activeShift.start_time).toLocaleString()}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '15px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>VENTAS (+EFEC)</div>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#15803d' }}>${cashReportData.ventasEfectivo.toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '15px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#991b1b', fontWeight: 'bold' }}>GASTOS (-EFEC)</div>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>-${cashReportData.gastosEfectivo.toFixed(2)}</div>
                                    </div>
                                </div>

                                <div style={{ background: '#4a3728', padding: '20px', borderRadius: '15px', textAlign: 'center', color: '#fff' }}>
                                    <div style={{ fontSize: '12px', opacity: 0.8 }}>SALDO ESPERADO EN CAJA</div>
                                    <div style={{ fontSize: '30px', fontWeight: '900' }}>${cashReportData.esperado.toFixed(2)}</div>
                                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '5px' }}>(Fondo Inicial: ${activeShift.initial_fund})</div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '15px', border: '2px solid #3498db' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#3498db', display: 'block', marginBottom: '5px' }}>EFECTIVO FÍSICO CONTADO ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={cashPhysicalCount || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setCashPhysicalCount(isNaN(val) ? 0 : Math.max(0, val));
                                        }}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3498db', fontSize: '22px', fontWeight: '900', color: '#333', backgroundColor: '#fff' }}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div style={{ padding: '15px', borderRadius: '15px', textAlign: 'center', backgroundColor: cashReportData.diferencia === 0 ? '#f8f9fa' : (cashReportData.diferencia > 0 ? '#e3f2fd' : '#fff5f5'), border: '1px dashed #ccc' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>DIFERENCIA</div>
                                    <div style={{ fontSize: '24px', fontWeight: '900', color: cashReportData.diferencia === 0 ? '#27ae60' : (cashReportData.diferencia > 0 ? '#3498db' : '#e74c3c') }}>
                                        {cashReportData.diferencia >= 0 ? '+' : ''}${cashReportData.diferencia.toFixed(2)}
                                    </div>
                                </div>

                                <textarea
                                    placeholder="Observaciones del turno..."
                                    value={cashObservations}
                                    onChange={(e) => setCashObservations(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '60px', fontSize: '13px', backgroundColor: '#fff', color: '#333' }}
                                />

                                <button
                                    onClick={handleCloseShift}
                                    disabled={loading || cashPhysicalCount <= 0}
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        background: (loading || cashPhysicalCount <= 0) ? '#ddd' : '#27ae60',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '900',
                                        cursor: (loading || cashPhysicalCount <= 0) ? 'not-allowed' : 'pointer',
                                        fontSize: '16px'
                                    }}
                                >
                                    {loading ? 'GUARDANDO...' : 'CERRAR TURNO Y GUARDAR ARQUEO'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL HISTORIAL DE ARQUEOS (TURNOS) */}
            {showArqueoHistory && (
                <div
                    onClick={() => setShowArqueoHistory(false)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, backdropFilter: 'blur(10px)' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content-responsive"
                        style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '22px' }}>Historial de Turnos</h2>
                                {arqueoHistory.length > 0 && (
                                    <button
                                        onClick={handleExportHistoryCSV}
                                        className="btn-active-effect"
                                        style={{ padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <Download size={14} /> EXCEL (COMPLETO)
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowArqueoHistory(false)}
                                style={{ border: 'none', color: '#000', background: 'none', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="table-container">
                            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead style={{ background: '#4a3728', color: '#fff' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Inicio / Fin</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Fondo</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Ventas</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Gastos</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Esperado</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Real</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Dif.</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {arqueoHistory.length === 0 ? (
                                        <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No hay registros</td></tr>
                                    ) : (
                                        arqueoHistory.map((h, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{new Date(h.start_time).toLocaleString()}</div>
                                                    <div style={{ fontSize: '10px', color: '#999' }}>Fin: {h.end_time ? new Date(h.end_time).toLocaleString() : '---'}</div>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>${h.initial_fund}</td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>${h.sales_cash || 0}</td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>${h.expenses_cash || 0}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>${(h.expected_cash || h.expected_amount || 0)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>${(h.actual_cash || h.actual_amount || 0)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: '900', color: h.difference === 0 ? '#27ae60' : (h.difference > 0 ? '#3498db' : '#e74c3c') }}>
                                                    {h.difference > 0 ? '+' : ''}${h.difference || 0}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleExportSingleArqueoCSV(h)}
                                                        style={{ background: '#27ae60', color: '#fff', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CashArqueoModal;
