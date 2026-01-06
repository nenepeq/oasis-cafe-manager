import React from 'react';
import { Banknote, List, X, Download } from 'lucide-react';

/**
 * Modal de Arqueo de Caja y Historial de Conciliaciones
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
    handleSaveArqueo,
    loading,
    showArqueoHistory,
    setShowArqueoHistory,
    arqueoHistory
}) => {
    const handleExportHistoryCSV = () => {
        if (!arqueoHistory || arqueoHistory.length === 0) return;

        const now = new Date();
        const genDate = now.toLocaleDateString();
        const genTime = now.toLocaleTimeString();

        let csv = `OASIS CAFÉ - HISTORIAL COMPLETO DE ARQUEOS\n`;
        csv += `Fecha de generación: ${genDate} ${genTime}\n\n`;
        csv += `Fecha,Fondo Inicial,Ventas Efectivo,Gastos Efectivo,Esperado,Real,Diferencia,Observaciones\n`;

        arqueoHistory.forEach(h => {
            const date = new Date(h.created_at).toLocaleString();
            csv += `"${date}",${h.initial_fund},${h.sales_cash},${h.expenses_cash},${h.expected_amount},${h.actual_amount},${h.difference},"${h.observations || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Cortes_Caja_Completo_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportSingleArqueoCSV = (h) => {
        const now = new Date();
        const genDate = now.toLocaleDateString();
        const genTime = now.toLocaleTimeString();
        const arqueoDate = new Date(h.created_at).toLocaleString();

        let csv = `OASIS CAFÉ - REPORTE DE CIERRE DE CAJA\n`;
        csv += `Fecha del Arqueo: ${arqueoDate}\n`;
        csv += `Generado el: ${genDate} ${genTime}\n\n`;

        csv += `CONCEPTO,MONTO\n`;
        csv += `Fondo Inicial,$${h.initial_fund.toFixed(2)}\n`;
        csv += `(+) Ventas Efectivo,$${h.sales_cash.toFixed(2)}\n`;
        csv += `(-) Gastos Efectivo,-$${h.expenses_cash.toFixed(2)}\n`;
        csv += `SALDO ESPERADO,$${h.expected_amount.toFixed(2)}\n`;
        csv += `EFECTIVO FÍSICO,$${h.actual_amount.toFixed(2)}\n`;
        csv += `DIFERENCIA,$${h.difference.toFixed(2)}\n\n`;

        if (h.observations) {
            csv += `OBSERVACIONES: "${h.observations}"\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Corte_Caja_${new Date(h.created_at).toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '24px' }}>Arqueo de Caja</h2>
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
                        <div style={{ backgroundColor: '#fdfbf9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                            <label style={{ fontSize: '20px', fontWeight: 'bold', color: '#888', display: 'block', marginBottom: '5px' }}>FONDO INICIAL ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={cashInitialFund || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setCashInitialFund(isNaN(val) ? 0 : Math.max(0, val));
                                }}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#fff', color: '#333' }}
                                placeholder="0.00"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>VENTAS EFECTIVO</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#15803d' }}>${cashReportData.ventasEfectivo.toFixed(2)}</div>
                            </div>
                            <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#991b1b', fontWeight: 'bold' }}>GASTOS HOY</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>-${cashReportData.gastosEfectivo.toFixed(2)}</div>
                            </div>
                        </div>

                        <div style={{ background: '#e07625ff', padding: '20px', borderRadius: '15px', textAlign: 'center', color: '#fff' }}>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>SALDO ESPERADO EN CAJA</div>
                            <div style={{ fontSize: '30px', fontWeight: '900' }}>${cashReportData.esperado.toFixed(2)}</div>
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
                                placeholder="Escribe cuánto dinero hay..."
                            />
                        </div>

                        <div style={{ padding: '15px', borderRadius: '15px', textAlign: 'center', backgroundColor: cashReportData.diferencia === 0 ? '#f8f9fa' : (cashReportData.diferencia > 0 ? '#e3f2fd' : '#fff5f5'), border: '1px dashed #ccc' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>DIFERENCIA</div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: cashReportData.diferencia === 0 ? '#27ae60' : (cashReportData.diferencia > 0 ? '#3498db' : '#e74c3c') }}>
                                {cashReportData.diferencia >= 0 ? '+' : ''}${cashReportData.diferencia.toFixed(2)}
                            </div>
                        </div>

                        <textarea
                            placeholder="Observaciones..."
                            value={cashObservations}
                            onChange={(e) => setCashObservations(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '60px', fontSize: '13px', backgroundColor: '#fff', color: '#333' }}
                        />

                        <button
                            onClick={handleSaveArqueo}
                            disabled={loading || cashInitialFund < 0 || cashPhysicalCount <= 0}
                            style={{
                                width: '100%',
                                padding: '15px',
                                background: (loading || cashInitialFund < 0 || cashPhysicalCount <= 0) ? '#ddd' : '#27ae60',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '900',
                                cursor: (loading || cashInitialFund < 0 || cashPhysicalCount <= 0) ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                opacity: (cashInitialFund >= 0 && cashPhysicalCount > 0) ? 1 : 0.7
                            }}
                        >
                            {loading ? 'GUARDANDO...' : 'FINALIZAR Y GUARDAR CORTE'}
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL HISTORIAL DE ARQUEOS */}
            {showArqueoHistory && (
                <div
                    onClick={() => setShowArqueoHistory(false)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, backdropFilter: 'blur(10px)' }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content-responsive"
                        style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '30px', width: '95%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '22px' }}>Historial de Cortes de Caja</h2>
                                {arqueoHistory.length > 0 && (
                                    <button
                                        onClick={handleExportHistoryCSV}
                                        className="btn-active-effect"
                                        style={{
                                            padding: '8px 16px',
                                            background: '#27ae60',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            fontWeight: '900',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        <Download size={14} /> EXCEL (COMPLETO)
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowArqueoHistory(false)}
                                style={{ border: 'none', color: '#000000', background: 'none', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="table-container">
                            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ background: '#4a3728', color: '#fff' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Fondo</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Esperado</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Real</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Diferencia</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Excel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {arqueoHistory.length === 0 ? (
                                        <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: '#999' }}>No hay registros guardados</td></tr>
                                    ) : (
                                        arqueoHistory.map((h, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#333' }}>{new Date(h.created_at).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '10px', color: '#999' }}>{new Date(h.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td style={{ padding: '12px', color: '#333', textAlign: 'center', }}>${h.initial_fund}</td>
                                                <td style={{ padding: '12px', color: '#333', textAlign: 'center', fontWeight: 'bold', }}>${h.expected_amount}</td>
                                                <td style={{ padding: '12px', color: '#333', textAlign: 'center', fontWeight: 'bold' }}>${h.actual_amount}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: '900', color: h.difference === 0 ? '#27ae60' : (h.difference > 0 ? '#3498db' : '#e74c3c') }}>
                                                    {h.difference > 0 ? '+' : ''}${h.difference}
                                                    {h.observations && <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666', fontStyle: 'italic' }}>{h.observations}</div>}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleExportSingleArqueoCSV(h)}
                                                        className="btn-active-effect"
                                                        style={{
                                                            background: '#27ae60',
                                                            color: '#fff',
                                                            border: 'none',
                                                            padding: '6px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Exportar a Excel"
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
