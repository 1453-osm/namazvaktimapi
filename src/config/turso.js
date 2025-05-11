const { createClient } = require('@libsql/client');
require('dotenv').config();

const tursoUrl = process.env.TURSO_DATABASE_URL || 'libsql://namazvaktimdb-1453-osm.aws-us-east-1.turso.io';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDY4ODg0NjQsImlkIjoiMzg3MDQ0OTktMjcwZS00M2U1LWFiMTEtNjQ1ZDhmNDEzMWQwIiwicmlkIjoiZjUyYzNiYTQtMDUxZS00MDlmLThkOGUtODdkY2Q2NjdlYWI1In0.oKUkQ9I0kIz4dMWa94aqZy9ksNGIKRXYjGEx6medoi8zJ-Vu26-kozApR-8rrtH1RVDPzva3YC4-qzklVkAsAw';

if (!tursoUrl) {
  console.error('HATA: TURSO_DATABASE_URL tanımlanmamış veya boş!');
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken
});

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

module.exports = {
  client,
  testConnection,
  execute: (query, params) => client.execute(query, params)
}; 