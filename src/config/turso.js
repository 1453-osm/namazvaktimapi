const { createClient } = require('@libsql/client');
require('dotenv').config({ optional: true });

console.log('Turso veritabanı bilgileri yükleniyor...');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Bağlantı bilgilerini kontrol et
const tursoUrl = process.env.TURSO_DATABASE_URL || 'libsql://namazvaktimdb-1453-osm.aws-us-east-1.turso.io';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDY4ODg0NjQsImlkIjoiMzg3MDQ0OTktMjcwZS00M2U1LWFiMTEtNjQ1ZDhmNDEzMWQwIiwicmlkIjoiZjUyYzNiYTQtMDUxZS00MDlmLThkOGUtODdkY2Q2NjdlYWI1In0.oKUkQ9I0kIz4dMWa94aqZy9ksNGIKRXYjGEx6medoi8zJ-Vu26-kozApR-8rrtH1RVDPzva3YC4-qzklVkAsAw';

console.log('TURSO_DATABASE_URL:', tursoUrl.substring(0, 20) + "...");
console.log('TURSO_AUTH_TOKEN: (uzunluk)', tursoAuthToken ? tursoAuthToken.length : 0);

let client;

try {
  // Veritabanı bağlantısı
  client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken
  });
  console.log('Turso istemcisi oluşturuldu');
} catch (error) {
  console.error('Turso istemcisi oluşturulurken hata:', error.message);
  // Hatalı durumda boş bir istemci oluştur, ancak uygulamanın çökmesine izin verme
  client = {
    execute: async () => {
      throw new Error('Turso veritabanı bağlantısı başarısız oldu');
    }
  };
}

const testConnection = async () => {
  try {
    const result = await client.execute('SELECT datetime("now") as current_time');
    console.log('Turso veritabanı bağlantısı başarılı! Sunucu zamanı:', result.rows[0].current_time);
    return true;
  } catch (err) {
    console.error('Turso veritabanı bağlantı testi başarısız:', err.message);
    return false;
  }
};

const execute = async (query, params) => {
  try {
    return await client.execute(query, params);
  } catch (error) {
    console.error('Turso veritabanı sorgusu hatası:', error.message);
    console.error('Sorgu:', query);
    console.error('Parametreler:', params);
    throw error;
  }
};

module.exports = {
  client,
  testConnection,
  execute
}; 