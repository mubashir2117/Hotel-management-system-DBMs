const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: false
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },

  connectionTimeout: 30000,
  requestTimeout: 30000
};

let pool;

async function getConnection() {
  try {
    if (!pool) {
      console.log('🔄 Trying to connect to SQL Server...');
      pool = await sql.connect(config);
      console.log('✅ Database Connected Successfully!');
    }
    return pool;
  } catch (err) {
    console.error('❌ Database Connection Error:', err.message);
    console.error('Error Code:', err.code);
    throw err;
  }
}

module.exports = { getConnection, sql };