import { supabase } from './src/supabaseClient.js';

async function checkSettingsTable() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1);

        if (error) {
            console.log('Error or table does not exist:', error.message);
        } else {
            console.log('Table exists, data:', data);
        }
    } catch (e) {
        console.log('Exception:', e.message);
    }
}

checkSettingsTable();
