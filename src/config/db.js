const { Pool } = require('pg');
require('dotenv').config();

// SSL bağlantı ayarlarını ekleyelim
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://namazvaktimdb_owner:npg_7iuFLUEXv6Cs@ep-proud-lab-a4dbdbma-pooler.us-east-1.aws.neon.tech/namazvaktimdb?sslmode=require',
  ssl: {
    rejectUnauthorized: false // Cloud ortamında SSL bağlantı sorunlarını önlemek için
  }
};

const pool = new Pool(poolConfig);

// Bağlantı başarılı olup olmadığını kontrol edelim
pool.on('connect', () => {
  console.log('Veritabanına bağlandı');
});

pool.on('error', (err) => {
  console.error('Veritabanı bağlantı hatası:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
}; 