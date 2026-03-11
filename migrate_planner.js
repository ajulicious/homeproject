require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingPlannedWeeks() {
    console.log('Fetching tasks...');
    const { data: tasks, error: fetchError } = await supabase.from('tasks').select('*');
    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    console.log(`Found ${tasks.length} tasks. Seeding planned weeks...`);

    // Mapping default planned weeks based on PRD logic
    const tasksUpdates = [];

    for (const task of tasks) {
        let planned = [];
        const t = task.title.toLowerCase();

        // M1
        if (t.includes('sumber bocor') ||
            t.includes('acian dinding interior') ||
            t.includes('waterproofing dak') ||
            t.includes('pondasi sanggah') ||
            t.includes('separator area') ||
            t.includes('glass block') ||
            t.includes('compound')
        ) {
            planned.push(1);
        }

        // M2
        if (t.includes('kerok & aci') ||
            t.includes('waterproofing dak') ||
            t.includes('separator area') ||
            t.includes('glass block') ||
            t.includes('compound') ||
            t.includes('pengecatan dasar') ||
            t.includes('granit lantai interior') ||
            t.includes('granit & keramik kamar')
        ) {
            planned.push(2);
        }

        // M3
        if (t.includes('granit lantai interior') ||
            t.includes('granit & keramik kamar') ||
            t.includes('tembok pagar fasad') ||
            t.includes('roster pagar depan') ||
            t.includes('cat akhir dinding')
        ) {
            planned.push(3);
        }

        // M4
        if (t.includes('tembok pagar fasad') ||
            t.includes('roster pagar depan') ||
            t.includes('cat akhir dinding') ||
            t.includes('pintu kamper & sliding') ||
            t.includes('finishing pintu') ||
            t.includes('stop kontak') ||
            t.includes('keramik teras') ||
            t.includes('sealer tembok luar')
        ) {
            planned.push(4);
        }

        // M5
        if (t.includes('pintu kamper & sliding') ||
            t.includes('finishing pintu') ||
            t.includes('stop kontak') ||
            t.includes('closet, shower') ||
            t.includes('keramik teras') ||
            t.includes('paving block') ||
            t.includes('sealer tembok luar') ||
            t.includes('pengecatan pagar & eksterior')
        ) {
            planned.push(5);
        }

        // M6
        if (t.includes('paving block') ||
            t.includes('kanopi carport') ||
            t.includes('pengecatan pagar & eksterior') ||
            t.includes('retouch cat') ||
            t.includes('deep cleaning')
        ) {
            planned.push(6);
        }

        tasksUpdates.push({ ...task, planned_weeks: planned });
    }

    console.log('Sending updates...');
    const { data: updateData, error: updateError } = await supabase
        .from('tasks')
        .upsert(tasksUpdates, { onConflict: 'id' });

    if (updateError) {
        console.error('Update Error:', updateError);
    } else {
        console.log('Successfully seeded planned_weeks!');
    }
}

addMissingPlannedWeeks();
