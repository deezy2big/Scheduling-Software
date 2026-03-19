require('dotenv').config();
const db = require('./db');

// ============================================================
// SPREADSHEET DATA: MP Schedule Groups_Names_2025.xlsx
// Structure: { group, category, code, name }
// Skipped: 1) Rooms, 6) PCR Traffic, 7) Stage Traffic
// ============================================================
const ROLES = [
  // ── PRODUCTION ─────────────────────────────────────────────
  { group: 'Production', category: '3) Production', code: 'A.01', name: 'Coordinating Producer' },
  { group: 'Production', category: '3) Production', code: 'A.02', name: 'Sr Producer' },
  { group: 'Production', category: '3) Production', code: 'A.03', name: 'Producer' },
  { group: 'Production', category: '3) Production', code: 'A.04', name: 'Supervising Producer' },
  { group: 'Production', category: '3) Production', code: 'A.05', name: 'Segment Producer' },
  { group: 'Production', category: '3) Production', code: 'A.06', name: 'Associate Producer' },
  { group: 'Production', category: '3) Production', code: 'A.07', name: 'Broadcast Associate' },
  { group: 'Production', category: '3) Production', code: 'A.08', name: 'Production Assistant' },
  { group: 'Production', category: '3) Production', code: 'A.09', name: 'PA-BA' },
  { group: 'Production', category: '3) Production', code: 'A.45', name: 'Sr. Coordinating Producer' },
  { group: 'Production', category: '3) Production', code: 'A.46', name: 'Producer- Highlights' },
  { group: 'Production', category: '3) Production', code: 'A.47', name: 'AP - Replay Producer' },
  { group: 'Production', category: '3) Production', code: 'A.48', name: 'AP - Graphics Producer VW' },
  { group: 'Production', category: '3) Production', code: 'A.49', name: 'AP- Segment Producer' },
  { group: 'Production', category: '3) Production', code: 'A.50', name: 'PA- Prompter' },
  { group: 'Production', category: '3) Production', code: 'A.51', name: 'PA- Spotter' },
  { group: 'Production', category: '3) Production', code: 'A.52', name: 'PA- Stick' },
  { group: 'Production', category: '3) Production', code: 'A.53', name: 'Seg Prod- Producer' },
  { group: 'Production', category: '3) Production', code: 'A.54', name: 'Seg Prod - Replay Producer' },
  { group: 'Production', category: '3) Production', code: 'A.55', name: 'Seg Prod - Graphics Producer VW' },
  { group: 'Production', category: '3) Production', code: 'A.64', name: 'Podcast Producer' },
  { group: 'Production', category: '3) Production', code: 'A.65', name: 'Producer - Segment Producer' },
  { group: 'Production', category: '3) Production', code: 'A.69', name: 'Seg Prod- Prep' },
  { group: 'Production', category: '3) Production', code: 'A.70', name: 'CP - Back Bench' },
  { group: 'Production', category: '3) Production', code: 'A.71', name: 'CP- Producer' },
  { group: 'Production', category: '3) Production', code: 'A.72', name: 'CP- Prep' },
  { group: 'Production', category: '3) Production', code: 'A.73', name: 'Sr Prod- Back Bench' },
  { group: 'Production', category: '3) Production', code: 'A.74', name: 'Sr Prod- Producer' },
  { group: 'Production', category: '3) Production', code: 'A.76', name: 'Sr. Prod - Prep' },
  { group: 'Production', category: '3) Production', code: 'A.77', name: 'Producer- Back Bench' },
  { group: 'Production', category: '3) Production', code: 'A.78', name: 'Producer- Segment Producer' },
  { group: 'Production', category: '3) Production', code: 'A.79', name: 'PA- Prep' },
  { group: 'Production', category: '3) Production', code: 'A.80', name: 'BA (Freelance)' },
  { group: 'Production', category: '3) Production', code: 'A.81', name: 'Producer- Prep' },
  { group: 'Production', category: '3) Production', code: 'A.82', name: 'AP- Broadcast Associate' },
  { group: 'Production', category: '3) Production', code: 'A.89', name: 'AP- Producer' },
  { group: 'Production', category: '3) Production', code: 'A.91', name: 'AP- Prep' },
  { group: 'Production', category: '3) Production', code: 'A.92', name: 'PA- BA' },
  { group: 'Production', category: '3) Production', code: 'E.01', name: 'AP- Edit' },
  { group: 'Production', category: '3) Production', code: 'E.02', name: 'AP- Content Manager' },
  { group: 'Production', category: '3) Production', code: 'E.03', name: 'AP- Elements' },
  { group: 'Production', category: '3) Production', code: 'E.04', name: 'AP- Highlights' },
  { group: 'Production', category: '3) Production', code: 'E.05', name: 'AP - Hisupe' },
  { group: 'Production', category: '3) Production', code: 'E.06', name: 'AP- Libero' },
  { group: 'Production', category: '3) Production', code: 'E.07', name: 'AP-Open' },
  { group: 'Production', category: '3) Production', code: 'E.08', name: 'AP- Sound' },
  { group: 'Production', category: '3) Production', code: 'E.18', name: 'PA- Edit' },
  { group: 'Production', category: '3) Production', code: 'E.19', name: 'PA- Highlights' },
  { group: 'Production', category: '3) Production', code: 'E.20', name: 'PA- Libero' },
  { group: 'Production', category: '3) Production', code: 'E.21', name: 'PA- Logger' },
  { group: 'Production', category: '3) Production', code: 'E.22', name: 'PA- Open' },
  { group: 'Production', category: '3) Production', code: 'E.23', name: 'PA- Open Assistant' },
  { group: 'Production', category: '3) Production', code: 'E.24', name: 'PA- Sound Assistant' },
  { group: 'Production', category: '3) Production', code: 'E.25', name: 'PA- Sound Log' },
  { group: 'Production', category: '3) Production', code: 'E.27', name: 'PA - Highlight Farm Replay Producer' },
  { group: 'Production', category: '3) Production', code: 'E.28', name: 'Seg Prod- HL Farm Replay Producer' },
  { group: 'Production', category: '3) Production', code: 'E.31', name: 'Seg Prod- Content Manager' },
  { group: 'Production', category: '3) Production', code: 'E.32', name: 'Seg Producer- Hisupe' },
  { group: 'Production', category: '3) Production', code: 'E.33', name: 'Seg Prod- Open' },
  { group: 'Production', category: '3) Production', code: 'E.34', name: 'Seg Prod- Sound' },
  { group: 'Production', category: '3) Production', code: 'E.35', name: 'PA- Edit (E.35)' }, // duplicate resolved
  { group: 'Production', category: '3) Production', code: 'E.36', name: 'Sr Prod- Hisupe' },
  { group: 'Production', category: '3) Production', code: 'E.37', name: 'Producer- Hisupe' },
  { group: 'Production', category: '3) Production', code: 'E.38', name: 'Producer- Content Manager' },
  { group: 'Production', category: '3) Production', code: 'E.39', name: 'PA- Content Manager' },

  // ── TECH CREWS: PCR Crew ───────────────────────────────────
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.01',  name: 'Director' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.02',  name: 'Associate Director' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.02O', name: 'Associate Director Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.04',  name: 'Audio 1' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.04O', name: 'Audio 1 Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.05',  name: 'Audio 2' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.05O', name: 'Audio 2 Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.11',  name: 'Replay Operator' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.11O', name: 'Replay Operator Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.21',  name: 'Media Librarian' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.22',  name: 'Playback Operator' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.22O', name: 'Playback Operator Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.23',  name: 'Replay Playback Operator' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.23O', name: 'Replay Playback Operator Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.25',  name: 'Prompter Operator' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.29',  name: 'Tape / EVS' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.30',  name: 'Technical Director' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.30O', name: 'Technical Director Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.36',  name: 'Graphics Operator VW' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.36O', name: 'Graphics Operator VW Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.48',  name: 'Audio Comms' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.68',  name: 'Graphics Operator 1' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.68O', name: 'Graphics Operator 1 Observation' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.69',  name: 'Graphics Operator 2' },
  { group: 'Tech Crews', category: '4) PCR Crew', code: 'B.69O', name: 'Graphics Operator 2 Observation' },

  // ── TECH CREWS: Stage Crew ─────────────────────────────────
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.03',  name: 'Stage Manager' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.03O', name: 'Stage Manager Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.06',  name: 'Audio 3' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.06O', name: 'Audio 3 Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.07',  name: 'Camera Operator' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.07O', name: 'Camera Operator Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.09',  name: 'A1 Other' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.10',  name: 'Electric' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.10O', name: 'Electric Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.16',  name: 'Handheld Camera Operator' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.18',  name: 'Jib Operator' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.18O', name: 'Jib Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.19',  name: 'Lighting Director' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.19O', name: 'Lighting Director Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.26',  name: 'Robotic Camera Operator' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.26O', name: 'Robotic Camera Op Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.27',  name: 'Steadicam Operator' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.27O', name: 'Steadicam Operator Observation' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.34',  name: 'Utility' },
  { group: 'Tech Crews', category: '5) Stage Crew', code: 'B.34O', name: 'Utility Observation' },

  // ── TECH CREWS: Facility Crew ──────────────────────────────
  { group: 'Tech Crews', category: 'Facility Crew', code: 'B.31',  name: 'Transmission Op' },
  { group: 'Tech Crews', category: 'Facility Crew', code: 'B.31O', name: 'Transmission Op Observation' },
  { group: 'Tech Crews', category: 'Facility Crew', code: 'B.32',  name: 'Transmission Coordinator' },
  { group: 'Tech Crews', category: 'Facility Crew', code: 'B.35',  name: 'Video' },
  { group: 'Tech Crews', category: 'Facility Crew', code: 'B.35O', name: 'Video Observation' },
  { group: 'Tech Crews', category: 'Facility Crew', code: 'B.58',  name: 'TOC Operator' },

  // ── POST PRODUCTION ────────────────────────────────────────
  { group: 'Post Production', category: '8) Post Production', code: 'A.63',  name: 'Digital Content Editor' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.12',  name: 'File Transfer' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.12O', name: 'File Transfer Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.17',  name: 'Ingest' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.17O', name: 'Ingest Operator Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.41',  name: 'Libero Editor' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.53',  name: 'Archive' },
  { group: 'Post Production', category: '8) Post Production', code: 'B.53O', name: 'Archive Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'C.07',  name: 'Post Production Assistant' },
  { group: 'Post Production', category: '8) Post Production', code: 'C.07O', name: 'Post Production Assistant Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'C.44',  name: 'Senior Editor' },
  { group: 'Post Production', category: '8) Post Production', code: 'C.45',  name: 'Deputy Editor' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.09',  name: 'Color Correction' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.10',  name: 'Combo Programming' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.11',  name: 'Editor 1' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.11O', name: 'Editor 1 Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.12',  name: 'Editor 2' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.12O', name: 'Editor 2 Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.13',  name: 'Editor 3' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.13O', name: 'Editor 3 Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.14',  name: 'Editor 4' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.14O', name: 'Editor 4 Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.15',  name: 'Editor 5' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.15O', name: 'Editor 5 Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.17O', name: 'Libero Editor Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.29',  name: 'Pro Tools Mixer' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.29O', name: 'Pro Tool Mixer Observation' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.30',  name: 'Pro Tool Mixer 2' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.40',  name: 'Post Supervisor' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.41',  name: 'Editor 1 - VOD' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.42',  name: 'Editor 2 - VOD' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.43',  name: 'Editor 3 - VOD' },
  { group: 'Post Production', category: '8) Post Production', code: 'E.44',  name: 'Editor 4 - VOD' },

  // ── DIGITAL ────────────────────────────────────────────────
  { group: 'Digital', category: 'Digital', code: 'A.35',  name: 'Digital Associate Producer' },
  { group: 'Digital', category: 'Digital', code: 'A.36',  name: 'Digital Segment Producer' },
  { group: 'Digital', category: 'Digital', code: 'A.37',  name: 'Digital Production Assistant' },
  { group: 'Digital', category: 'Digital', code: 'A.38',  name: 'Digital Programming Assistant' },
  { group: 'Digital', category: 'Digital', code: 'A.39',  name: 'Digital Senior Producer' },
  { group: 'Digital', category: 'Digital', code: 'A.40',  name: 'Digital Content Producer' },
  { group: 'Digital', category: 'Digital', code: 'A.41',  name: 'Digital Coordinating Producer' },
  { group: 'Digital', category: 'Digital', code: 'A.42',  name: 'Digital Sales Coordinator' },
  { group: 'Digital', category: 'Digital', code: 'A.43',  name: 'Digital Video Content Coordinator' },
  { group: 'Digital', category: 'Digital', code: 'A.44',  name: 'Digital Technical Manager' },
  { group: 'Digital', category: 'Digital', code: 'A.56',  name: 'Digital Director' },
  { group: 'Digital', category: 'Digital', code: 'A.58',  name: 'Digital Programming Manager' },
  { group: 'Digital', category: 'Digital', code: 'A.59',  name: 'Digital Programming Coordinator' },
  { group: 'Digital', category: 'Digital', code: 'A.66',  name: 'Digital Manager' },
  { group: 'Digital', category: 'Digital', code: 'A.67',  name: 'Digital Sr. Manager' },
  { group: 'Digital', category: 'Digital', code: 'A.68',  name: 'Digital Sr. Coordinator' },
  { group: 'Digital', category: 'Digital', code: 'B.55',  name: 'Video Programming Assistant' },
  { group: 'Digital', category: 'Digital', code: 'B.55O', name: 'Video Programming Assistant Observation' },
  { group: 'Digital', category: 'Digital', code: 'B.59',  name: 'Digital Media Specialist' },
  { group: 'Digital', category: 'Digital', code: 'B.60',  name: 'Fiber Tech' },
  { group: 'Digital', category: 'Digital', code: 'B.62',  name: 'Digital Video Content Coordinator (B.62)' }, // duplicate resolved
  { group: 'Digital', category: 'Digital', code: 'B.65',  name: 'Digital Media Specialist 1' },
  { group: 'Digital', category: 'Digital', code: 'B.66',  name: 'Digital Media Specialist 2' },
];

// Group colors
const GROUP_COLORS = {
  'Production':      '#10B981', // green
  'Tech Crews':      '#3B82F6', // blue
  'Post Production': '#8B5CF6', // purple
  'Digital':         '#F59E0B', // amber
};

async function run() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Running migration v14: Import spreadsheet roles as types...\n');

    // ── STEP 1: Clear all existing data ─────────────────────
    console.log('Step 1: Clearing existing data...');

    // NULL out type references before deleting types
    await client.query('UPDATE workorder_resources SET type_id = NULL WHERE type_id IS NOT NULL');
    await client.query('UPDATE service_positions SET type_id = NULL WHERE type_id IS NOT NULL');

    // Clear junction tables
    await client.query('DELETE FROM resource_types');
    await client.query('DELETE FROM resource_group_memberships');

    // Clear resources
    await client.query('DELETE FROM resources');

    // Clear hierarchy (CASCADE handles child rows)
    await client.query('DELETE FROM types');
    await client.query('DELETE FROM categories');
    await client.query('DELETE FROM groups');

    // Clear legacy tables if they exist
    try {
      await client.query('DELETE FROM resource_positions');
      await client.query('DELETE FROM positions');
      await client.query('DELETE FROM position_groups');
    } catch (e) {
      // Legacy tables may not exist — that's fine
    }

    console.log('  ✓ All existing data cleared\n');

    // ── STEP 2: Build unique groups ──────────────────────────
    console.log('Step 2: Creating groups...');
    const uniqueGroups = [...new Set(ROLES.map(r => r.group))];
    const groupMap = {}; // group name → id

    for (let i = 0; i < uniqueGroups.length; i++) {
      const name = uniqueGroups[i];
      const { rows } = await client.query(
        `INSERT INTO groups (name, color, is_active, display_order)
         VALUES ($1, $2, true, $3)
         RETURNING id`,
        [name, GROUP_COLORS[name] || '#6B7280', i]
      );
      groupMap[name] = rows[0].id;
      console.log(`  ✓ Group: ${name} (id=${rows[0].id})`);
    }

    // ── STEP 3: Build unique categories ─────────────────────
    console.log('\nStep 3: Creating categories...');
    const categoryMap = {}; // "group|category" → id
    const seenCategories = new Set();
    let catOrder = 0;

    for (const role of ROLES) {
      const key = `${role.group}|${role.category}`;
      if (!seenCategories.has(key)) {
        seenCategories.add(key);
        const { rows } = await client.query(
          `INSERT INTO categories (group_id, name, display_order)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [groupMap[role.group], role.category, catOrder++]
        );
        categoryMap[key] = rows[0].id;
        console.log(`  ✓ Category: ${role.category} → ${role.group} (id=${rows[0].id})`);
      }
    }

    // ── STEP 4: Insert all types ─────────────────────────────
    console.log('\nStep 4: Creating types...');
    let typeCount = 0;

    for (let i = 0; i < ROLES.length; i++) {
      const role = ROLES[i];
      const catKey = `${role.group}|${role.category}`;
      await client.query(
        `INSERT INTO types (category_id, name, abbreviation, display_order)
         VALUES ($1, $2, $3, $4)`,
        [categoryMap[catKey], role.name, role.code, i]
      );
      typeCount++;
    }

    console.log(`  ✓ ${typeCount} types inserted\n`);

    // ── STEP 5: Add abbreviation indexes ────────────────────
    console.log('Step 5: Applying indexes from migration_v14.sql...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_types_abbreviation ON types(abbreviation)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_types_name_abbr ON types(name, abbreviation)');
    console.log('  ✓ Indexes created\n');

    await client.query('COMMIT');

    // ── Summary ──────────────────────────────────────────────
    console.log('='.repeat(50));
    console.log('Migration v14 complete!');
    console.log(`  Groups:     ${uniqueGroups.length}`);
    console.log(`  Categories: ${seenCategories.size}`);
    console.log(`  Types:      ${typeCount}`);
    console.log('='.repeat(50));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
