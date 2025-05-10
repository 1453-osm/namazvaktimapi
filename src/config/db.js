const { Pool } = require('pg');
require('dotenv').config();

console.log('Veritabanı bağlantı URL\'si kontrol ediliyor...');
const dbUrl = process.env.DATABASE_URL || 'postgresql://namazvaktimdb_owner:npg_7iuFLUEXv6Cs@ep-proud-lab-a4dbdbma-pooler.us-east-1.aws.neon.tech/namazvaktimdb?sslmode=require';
console.log('Veritabanı URL\'si kullanılabilir:', dbUrl ? 'Evet' : 'Hayır');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // SSL sertifika doğrulamasını kaldırır
  },
  max: 5, // maksimum bağlantı sayısı
  idleTimeoutMillis: 30000, // bağlantı zaman aşımı
  connectionTimeoutMillis: 5000, // bağlantı kurma zaman aşımı
  statement_timeout: 10000, // sorgu zaman aşımı (ms)
});

// Bağlantı olaylarını dinle
pool.on('connect', () => {
  console.log('Veritabanına yeni bağlantı kuruldu');
});

pool.on('error', (err) => {
  console.error('Beklenmeyen veritabanı hatası:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
}; 