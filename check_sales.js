import { supabase } from './src/supabaseClient.js';

async function checkLastSales() {
    try {
        console.log("Consultando últimas 5 ventas...");
        const { data, error } = await supabase
            .from('sales')
            .select('id, created_at, total, status, payment_method')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.log('Error fetching sales:', error.message);
        } else {
            console.log('Últimas ventas registradas:');
            data.forEach(s => {
                console.log(`ID: ${s.id} | Total: ${s.total} | Fecha: ${s.created_at} | Status: ${s.status}`);
            });
        }
    } catch (e) {
        console.log('Exception:', e.message);
    }
}

checkLastSales();
