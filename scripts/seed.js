require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  console.log('[Seed] Initializing database and loading seed data...');
  try {
    await db.initDB();
    console.log('[Seed] Database initialization and seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  }
}

run();
