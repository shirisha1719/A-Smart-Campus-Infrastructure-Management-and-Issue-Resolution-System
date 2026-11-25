require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  const configs = [
    { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'root' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'password' }
  ];

  for (const cfg of configs) {
    try {
      console.log(`Testing MySQL connection to ${cfg.host}:${cfg.port} with user '${cfg.user}'...`);
      const conn = await mysql.createConnection({ ...cfg, connectTimeout: 3000 });
      console.log('Successfully connected to MySQL server!');
      await conn.end();
      return true;
    } catch (err) {
      console.log(`Failed to connect with user '${cfg.user}': ${err.code || err.message}`);
    }
  }
  return false;
}

testConnection().then(res => {
  console.log('Result:', res);
  process.exit(0);
});
