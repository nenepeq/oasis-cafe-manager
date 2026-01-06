import { Award, X, Download } from 'lucide-react';

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
    starData
}) => {
    if (!showStarProducts || userRole !== 'admin') return null;

    const handleExportCSV = () => {
        if (starData.length === 0) return;

        const headers = ["Producto", "Cantidad Vendida", "Dinero Generado"];
        const rows = starData.map(item => [
            item.name,
            item.totalQty,
            item.totalRevenue.toFixed(2)
        ]);

        const csvContent = [
            `Reporte de Productos Estrella`,
            `Rango de fechas: ${starStartDate} al ${starEndDate}`,
            ``, // Línea vacía para separar el encabezado de los datos
            headers.join(","),
            ...rows.map(row => row.map(val => `"${val}"`).join(","))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Productos_Estrella_${starStartDate}_a_${starEndDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

                <h2 style={{ color: '#4a3728', fontWeight: '900', margin: '0 0 20px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Award size={30} color="#f1c40f" /> Productos Estrella
                </h2>

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

                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#4a3728', color: '#fff' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Cant. Vendida</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Dinero Generado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {starData.length === 0 ? (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No hay datos</td></tr>
                            ) : (
                                starData.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px', color: '#4a3728', fontWeight: 'bold' }}>
                                            {idx < 3 ? '⭐ ' : ''}{item.name}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '900', color: '#000000' }}>{item.totalQty}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#27ae60', fontWeight: '900' }}>
                                            ${item.totalRevenue.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StarProductsModal;
