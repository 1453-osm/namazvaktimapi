const { Pool } = require('pg');
require('dotenv').config();

console.log('Veritabanı bağlantı URL\'si kontrol ediliyor...');
const dbUrl = process.env.DATABASE_URL || 'postgresql://namazvaktimdb_owner:npg_7iuFLUEXv6Cs@ep-proud-lab-a4dbdbma-pooler.us-east-1.aws.neon.tech/namazvaktimdb?sslmode=require';

// URL'nin var olup olmadığını ve temel formatı kontrol et
if (!dbUrl) {
  console.error('HATA: DATABASE_URL tanımlanmamış veya boş!');
  process.exit(1);
}

// Githab Actions'ta mıyız?
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
if (isGithubActions) {
  console.log('GitHub Actions ortamında çalışıyor.');
}

// URL'yi "*" ile maskeleyerek göster (güvenlik için)
const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log('Veritabanı URL (maskelenmiş):', maskedUrl);

// Bağlantı havuzunu oluştur
console.log('Bağlantı havuzu oluşturuluyor...');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // SSL sertifika doğrulamasını kaldırır
  },
  max: isGithubActions ? 10 : 5, // GitHub Actions'da daha fazla bağlantı 
  idleTimeoutMillis: 30000, // bağlantı zaman aşımı
  connectionTimeoutMillis: isGithubActions ? 10000 : 5000, // GitHub Actions'da daha uzun timeout
  statement_timeout: isGithubActions ? 30000 : 10000, // GitHub Actions'da daha uzun sorgu timeout
});

// Bağlantı olaylarını dinle
pool.on('connect', () => {
  console.log('Veritabanına yeni bağlantı kuruldu');
});

pool.on('error', (err) => {
  console.error('Beklenmeyen veritabanı hatası:', err.message);
  
  if (err.code) {
    console.error('Hata kodu:', err.code);
  }
  
  // Kritik hatalarda işlemi sonlandır (bağlantı kurulamadığında)
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
    console.error('Kritik veritabanı hatası: Bağlantı kurulamadı');
    console.error('Veritabanı URL formatını ve erişim bilgilerini kontrol edin');
    
    if (isGithubActions) {
      console.error('GitHub Actions için SECRET_DATABASE_URL değerini kontrol edin!');
    }
  }
});

// Bağlantıyı test etme yardımcı fonksiyonu
const testConnection = async () => {
  let client;
  try {
    console.log('Veritabanı bağlantısı test ediliyor...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Veritabanı bağlantısı başarılı! Sunucu zamanı:', result.rows[0].current_time);
    return true;
  } catch (err) {
    console.error('Veritabanı bağlantı testi başarısız:', err.message);
    if (err.code) {
      console.error('Hata kodu:', err.code);
    }
    return false;
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
}; 