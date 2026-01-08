import React, { useState } from 'react';
import { Award, X, Download, TrendingUp, Clock, Target, ArrowRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Modal de Productos Estrella (Ranking de Ventas)
 */
const StarProductsModal = ({
    showStarProducts,
    setShowStarProducts,
    userRole,
    starStartDate,
    setStarStartDate,
    starEndDate,
    setStarEndDate,
    fetchStarProducts,
    starData,
    kpiData
}) => {
    const [activeTab, setActiveTab] = useState('ranking'); // 'ranking' | 'kpis'
    if (!showStarProducts || userRole !== 'admin') return null;

    const handleExportCSV = async () => {
        if (starData.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Productos Estrella');

        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } };
        const goldFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };

        worksheet.mergeCells('A1:C1');
        const mainHeader = worksheet.getCell('A1');
        mainHeader.value = 'OASIS CAFÉ - PRODUCTOS ESTRELLA';
        mainHeader.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' } };
        mainHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        mainHeader.fill = headerFill;

        worksheet.getCell('A2').value = `Periodo: ${starStartDate} al ${starEndDate}`;
        worksheet.getRow(2).font = { bold: true };

        const rows = starData.map((item, idx) => [
            idx < 3 ? `⭐ ${item.name}` : item.name,
            item.totalQty,
            item.totalRevenue
        ]);

        worksheet.addTable({
            name: 'RankingProductos',
            ref: 'A4',
            headerRow: true,
            style: {
                theme: 'TableStyleMedium14', // Color naranja/dorado
                showRowStripes: true,
            },
            columns: [
                { name: 'Producto', filterButton: true },
                { name: 'Cantidad Vendida', filterButton: false },
                { name: 'Dinero Generado', filterButton: false },
            ],
            rows: rows,
        });

        // Aplicar formatos
        const startRow = 5;
        rows.forEach((r, idx) => {
            const rowNum = startRow + idx;
            const row = worksheet.getRow(rowNum);
            row.getCell(3).numFmt = '"$"#,##0.00';

            // Resaltar Top 3 con negrita si es necesario
            if (idx < 3) {
                row.getCell(1).font = { bold: true, color: { argb: 'FFC0392B' } };
            }
        });

        worksheet.getColumn(1).width = 30;
        worksheet.getColumn(2).width = 20;
        worksheet.getColumn(3).width = 20;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Productos_Estrella_Oasis_${starStartDate}.xlsx`);
    };

    return (
        <div
            onClick={() => setShowStarProducts(false)}
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
                    maxWidth: '700px',
                    maxHeight: '85vh',
                    overflowY: 'auto'
                }}
            >
                <button
                    onClick={() => setShowStarProducts(false)}
                    style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#000' }}
                >
                    <X size={30} />
                </button>

                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: '0 0 10px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '40px' }}>
                    <Award size={30} color="#f1c40f" /> Inteligencia de Negocio
                </h2>

                {/* SELECTOR DE TABS */}
                <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', background: '#f0ece6', padding: '5px', borderRadius: '15px' }}>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                            background: activeTab === 'ranking' ? '#fff' : 'transparent',
                            color: '#4a3728', fontWeight: '900', cursor: 'pointer',
                            boxShadow: activeTab === 'ranking' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        RANKING
                    </button>
                    <button
                        onClick={() => setActiveTab('kpis')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                            background: activeTab === 'kpis' ? '#fff' : 'transparent',
                            color: '#4a3728', fontWeight: '900', cursor: 'pointer',
                            boxShadow: activeTab === 'kpis' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        DASHBOARD
                    </button>
                </div>


                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#f8f6f2', padding: '15px', borderRadius: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>DESDE:</span>
                        <input
                            type="date"
                            value={starStartDate}
                            onChange={(e) => setStarStartDate(e.target.value)}
                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>HASTA:</span>
                        <input
                            type="date"
                            value={starEndDate}
                            onChange={(e) => setStarEndDate(e.target.value)}
                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end' }}>
                        <button
                            onClick={fetchStarProducts}
                            className="btn-active-effect"
                            style={{ padding: '10px 20px', background: '#4a3728', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            VER REPORTE
                        </button>
                        {starData.length > 0 && (
                            <button
                                onClick={handleExportCSV}
                                className="btn-active-effect"
                                style={{ padding: '10px 20px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Download size={18} /> EXCEL
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'ranking' ? (
                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                            <thead style={{ background: '#4a3728', color: '#fff' }}>
                                <tr>
                                    <th style={{ padding: '10px 5px', textAlign: 'left' }}>Producto</th>
                                    <th style={{ padding: '10px 5px', textAlign: 'center', width: '60px' }}>Cant.</th>
                                    <th style={{ padding: '10px 5px', textAlign: 'right', width: '85px' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {starData.length === 0 ? (
                                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No hay datos</td></tr>
                                ) : (
                                    starData.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{
                                                padding: '10px 5px',
                                                color: '#4a3728',
                                                fontWeight: 'bold',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }} title={item.name}>
                                                {idx < 3 ? '⭐ ' : ''}{item.name}
                                            </td>
                                            <td style={{ padding: '10px 5px', textAlign: 'center', fontWeight: '900', color: '#000000' }}>{item.totalQty}</td>
                                            <td style={{ padding: '10px 5px', textAlign: 'right', color: '#27ae60', fontWeight: '900' }}>
                                                ${item.totalRevenue.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {/* TARJETA: TICKET PROMEDIO */}
                        <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '20px', border: '1px solid #bae6fd' }}>
                            <div style={{ color: '#0369a1', marginBottom: '10px' }}><Target size={24} /></div>
                            <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 'bold' }}>TICKET PROMEDIO</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0c4a6e' }}>${kpiData.ticketPromedio.toFixed(2)}</div>
                            <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '5px' }}>Basado en {kpiData.totalVentas} ventas</div>
                        </div>

                        {/* TARJETA: HORA PICO */}
                        <div style={{ background: '#fff7ed', padding: '20px', borderRadius: '20px', border: '1px solid #ffedd5' }}>
                            <div style={{ color: '#c2410c', marginBottom: '10px' }}><Clock size={24} /></div>
                            <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: 'bold' }}>HORA PICO</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#7c2d12' }}>{kpiData.horaPico}</div>
                            <div style={{ fontSize: '10px', color: '#fb923c', marginTop: '5px' }}>Mayor flujo detectado</div>
                        </div>

                        {/* TARJETA: RENTABILIDAD */}
                        <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #dcfce7' }}>
                            <div style={{ color: '#15803d', marginBottom: '10px' }}><TrendingUp size={24} /></div>
                            <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>MARGEN ESTIMADO</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#166534' }}>{kpiData.margenReal.toFixed(1)}%</div>
                            <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '5px' }}>Sobre costo de producto</div>
                        </div>

                        {/* TARJETA DE RECOMENDACIÓN RÁPIDA */}
                        <div style={{ gridColumn: '1 / -1', background: '#4a3728', padding: '20px', borderRadius: '20px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', opacity: 0.8 }}>OASIS TIP:</div>
                                <div style={{ fontSize: '16px', fontWeight: '900' }}>
                                    {kpiData.ticketPromedio < 80 ? 'Sugiere postres para subir el ticket.' : 'Excelente ticket promedio.'}
                                </div>
                            </div>
                            <ArrowRight size={30} opacity={0.3} />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default StarProductsModal;
