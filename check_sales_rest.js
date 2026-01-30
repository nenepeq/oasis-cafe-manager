const https = require('https');

const SUPABASE_URL = 'https://uvclbuxgegmhnlflowjz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Y2xidXhnZWdtaG5sZmxvd2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODkzMDcsImV4cCI6MjA4MjU2NTMwN30.6hh9Wqck4MrapvOzzV2SHkK_dwWJux_0EdU2mwQJhbI';

const options = {
    hostname: 'uvclbuxgegmhnlflowjz.supabase.co',
    path: '/rest/v1/sales?select=id,created_at,total,status,payment_method&order=created_at.desc&limit=5',
    method: 'GET',
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Últimas ventas registradas (REST):');
            try {
                const sales = JSON.parse(data);
                sales.forEach(s => {
                    console.log(`ID: ${s.id} | Total: ${s.total} | Fecha: ${s.created_at} | Status: ${s.status}`);
                });
            } catch (e) {
                console.error("Error parseando JSON:", e);
                console.log("Raw data:", data);
            }
        } else {
            console.error(`Error de solicitud: ${res.statusCode}`);
            console.error(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problema con la solicitud: ${e.message}`);
});

req.end();
