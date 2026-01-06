import React from 'react';
import {
    X, PieChart, RefreshCw, TrendingUp, Layers, ArrowDown, DollarSign
} from 'lucide-react';

/**
 * Modal de Reporte Financiero Avanzado
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
    dailyStockList
}) => {
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
                style={{
                    position: 'relative',
                    backgroundColor: '#fff',
                    padding: '30px',
                    borderRadius: '30px',
                    width: '95%',
                    maxWidth: '900px',
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
                    <h2 style={{ color: '#000', fontWeight: '900', margin: '0 0 15px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PieChart size={28} /> Reporte Financiero
                    </h2>

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
                        <button
                            onClick={calculateFinances}
                            disabled={loading}
                            style={{ padding: '10px 20px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', alignSelf: 'flex-end' }}
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#999', fontSize: '18px' }}>Analizando datos...</div>
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
                                <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '5px' }}>Margen Real: {finData.margen.toFixed(1)}%</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginBottom: '30px' }}>
                            <div style={{ flex: 1, minWidth: '300px', background: '#fff', border: '1px solid #eee', borderRadius: '25px', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#666' }}>Distribución de Flujo</h3>
                                <div style={donutStyle}>
                                    <div style={innerCircleStyle}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#000' }}>{percentageProfit > 0 ? percentageProfit.toFixed(0) : 0}%</span>
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
                                        <span>{percentageExpenses.toFixed(1)}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ width: `${percentageExpenses}%`, height: '100%', background: '#e74c3c' }}></div>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                                        <span>Margen Neto (Bolsa)</span>
                                        <span>{finData.margen.toFixed(1)}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ width: `${finData.margen > 0 ? finData.margen : 0}%`, height: '100%', background: '#27ae60' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #ff9800', paddingBottom: '10px' }}>Gastos Operativos</h3>
                                {dailyExpensesList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>Sin gastos operativos en este periodo.</p> : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <tbody>
                                            {dailyExpensesList.map((exp) => (
                                                <tr key={exp.id} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '8px 0', color: '#555' }}>{exp.fecha} - {exp.concepto} <span style={{ fontSize: '10px', color: '#999' }}>({exp.categoria})</span></td>
                                                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c' }}>-${exp.monto}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#000', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>Entradas de Stock (Inversión)</h3>
                                {dailyStockList.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>No hay compras de stock en este periodo.</p> : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <tbody>
                                            {dailyStockList.map((purch) => (
                                                <tr key={purch.id} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '8px 0', color: '#555' }}>
                                                        {new Date(purch.created_at).toLocaleDateString()} - Compra #{purch.id.toString().slice(0, 4)}
                                                        <div style={{ fontSize: '10px', color: '#888' }}>{purch.purchase_items?.map(i => `${i.products?.name} ${i.quantity} x $${i.cost}`).join(', ')}</div>
                                                    </td>
                                                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c' }}>-${purch.total}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FinanceModal;
