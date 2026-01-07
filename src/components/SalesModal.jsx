import React from 'react';
import { X, RefreshCw, Download } from 'lucide-react';

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
    const handleExportSalesCSV = () => {
        if (!sales || sales.length === 0) return;

        const now = new Date().toLocaleString();
        let csv = `OASIS CAFÉ - REPORTE DE VENTAS\n`;
        csv += `Periodo: ${reportStartDate} al ${reportEndDate}\n`;
        csv += `Generado el: ${now}\n\n`;
        csv += 'Folio,Fecha,Cliente,Productos,Metodo Pago,Total,Estatus\n';
        sales.forEach(s => {
            const date = new Date(s.created_at).toLocaleString();
            const productsList = s.sale_items?.map(item => `${item.quantity}x ${item.products?.name || 'Producto'}`).join(' | ') || '';
            const folio = `#${s.id.slice(0, 4).toUpperCase()}`;
            csv += `${folio},"${date}","${s.customer_name}","${productsList}","${s.payment_method || ''}",${s.total},${s.status}\n`;
        });

        // Agregar fila de TOTAL al final
        csv += `\n,,,,,TOTAL,$${totalIngresosReporte.toFixed(2)}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Reporte_Ventas_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
