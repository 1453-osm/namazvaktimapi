const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const setupDatabase = async () => {
  try {
    console.log('Veritabanı şeması oluşturuluyor...');
    
    // SQL dosyasını oku
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Veritabanı bağlantısı
    const client = await pool.connect();
    
    try {
      // SQL komutlarını çalıştır
      await client.query(schemaSql);
      console.log('Veritabanı şeması başarıyla oluşturuldu!');
    } finally {
      // Bağlantıyı serbest bırak
      client.release();
    }
  } catch (error) {
    console.error('Veritabanı şeması oluşturulurken hata:', error);
    throw error;
  }
};

// Node.js uygulamasından doğrudan çalıştırıldığında
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Veritabanı kurulumu tamamlandı.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Veritabanı kurulumu başarısız:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;