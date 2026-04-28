import https from 'https';

const SUPABASE_URL = 'https://uvclbuxgegmhnlflowjz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fFJjl5AuS_ivlStMVDlvng_lqeEe_uf';

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
