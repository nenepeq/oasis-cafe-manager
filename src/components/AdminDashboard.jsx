import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

/**
 * Componente de Tablero Visual para Análisis de Datos
 */
const AdminDashboard = ({ salesData, expensesData, stockData }) => {

    // Helper para formatear fecha de forma segura (ignorar desfase UTC)
    const safeParseDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    };

    // 1. Procesar Ventas por Día de la Semana
    const weeklySales = useMemo(() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const data = days.map(day => ({ name: day, total: 0 }));

        salesData.forEach(sale => {
            const date = new Date(sale.created_at);
            const dayIndex = date.getDay();
            data[dayIndex].total += (sale.total || 0);
        });

        return data;
    }, [salesData]);

    // 2. Procesar Ventas por Hora (Hora Pico)
    const hourlySales = useMemo(() => {
        const data = Array.from({ length: 15 }, (_, i) => ({
            hour: `${i + 8}:00`,
            ventas: 0
        }));

        salesData.forEach(sale => {
            const date = new Date(sale.created_at);
            const hour = date.getHours();
            if (hour >= 8 && hour <= 22) {
                const index = hour - 8;
                data[index].ventas += 1; // Contamos transacciones
            }
        });

        return data;
    }, [salesData]);

    // 3. Tendencia Ingresos vs Egresos (Por fecha)
    const financialTrend = useMemo(() => {
        const trendMap = {};

        // Ingresos de ventas
        salesData.forEach(sale => {
            const date = safeParseDate(sale.created_at);
            if (!trendMap[date]) trendMap[date] = { date, ingresos: 0, egresos: 0 };
            trendMap[date].ingresos += (sale.total || 0);
        });

        // Egresos (Gastos + Compras)
        expensesData.forEach(exp => {
            // Expenses ya vienen en formato YYYY-MM-DD del MXDate helper
            const date = exp.fecha;
            if (!trendMap[date]) trendMap[date] = { date, ingresos: 0, egresos: 0 };
            trendMap[date].egresos += exp.monto;
        });

        stockData.forEach(stock => {
            const date = safeParseDate(stock.created_at);
            if (!trendMap[date]) trendMap[date] = { date, ingresos: 0, egresos: 0 };
            trendMap[date].egresos += stock.total;
        });

        return Object.values(trendMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [salesData, expensesData, stockData]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px 0' }}>

            {/* GRÁFICA DE VENTAS SEMANALES */}
            <div id="weekly-sales-chart" style={{ background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #eee' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>VENTAS POR DÍA DE LA SEMANA ($)</h4>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <BarChart data={weeklySales}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                            />
                            <Bar dataKey="total" fill="#27ae60" radius={[5, 5, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* HORA PICO */}
                <div id="hourly-sales-chart" style={{ background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>HORA PICO (TRANSACCIONES)</h4>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <AreaChart data={hourlySales}>
                                <defs>
                                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} interval={2} fontSize={10} />
                                <Tooltip />
                                <Area type="monotone" dataKey="ventas" stroke="#3498db" fillOpacity={1} fill="url(#colorVentas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TENDENCIA FINANCIERA */}
                <div id="financial-trend-chart" style={{ background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>INGRESOS VS EGRESOS</h4>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <LineChart data={financialTrend}>
                                <XAxis dataKey="date" hide />
                                <Tooltip />
                                <Legend verticalAlign="top" height={36} />
                                <Line type="monotone" dataKey="ingresos" stroke="#2ecc71" strokeWidth={3} dot={false} name="Ingresos" />
                                <Line type="monotone" dataKey="egresos" stroke="#e74c3c" strokeWidth={3} dot={false} name="Egresos" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;
