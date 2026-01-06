import React from 'react';
import { Banknote, List, X } from 'lucide-react';

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
                                style={{
                                    padding: '8px 12px',
                                    background: '#f8f6f2',
                                    color: '#4a3728',
                                    border: '1px solid #ddd',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
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
                                value={cashInitialFund || ''}
                                onChange={(e) => setCashInitialFund(parseFloat(e.target.value) || 0)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', fontWeight: 'bold' }}
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
                                value={cashPhysicalCount || ''}
                                onChange={(e) => setCashPhysicalCount(parseFloat(e.target.value) || 0)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3498db', fontSize: '22px', fontWeight: '900', color: '#333' }}
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
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '60px', fontSize: '13px' }}
                        />

                        <button
                            onClick={handleSaveArqueo}
                            disabled={loading}
                            style={{ width: '100%', padding: '15px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', fontSize: '16px' }}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ color: '#4a3728', fontWeight: '900', margin: 0, fontSize: '22px' }}>Historial de Cortes de Caja</h2>
                            <button
                                onClick={() => setShowArqueoHistory(false)}
                                style={{ border: 'none', color: '#000000', background: 'none', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ background: '#4a3728', color: '#fff' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Fondo</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Esperado</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>Real</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Diferencia</th>
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
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: h.difference === 0 ? '#27ae60' : (h.difference > 0 ? '#3498db' : '#e74c3c') }}>
                                                    {h.difference > 0 ? '+' : ''}${h.difference}
                                                    {h.observations && <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#666', fontStyle: 'italic' }}>{h.observations}</div>}
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
