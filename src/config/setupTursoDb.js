const fs = require('fs');
const path = require('path');
const { client } = require('./turso');

const setupDatabase = async () => {
  try {
    console.log('Turso veritabanı şeması oluşturuluyor...');
    
    // SQL dosyasını oku
    const schemaPath = path.join(__dirname, 'turso-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // SQL komutlarını parçala
    const sqlStatements = schemaSql.split(';').filter(statement => statement.trim() !== '');
    
    // Her SQL komutunu çalıştır
    for (const statement of sqlStatements) {
      if (statement.trim()) {
        await client.execute(statement + ';');
      }
    }
    
    console.log('Turso veritabanı şeması başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Turso veritabanı şeması oluşturulurken hata:', error);
    throw error;
  }
};

// Node.js uygulamasından doğrudan çalıştırıldığında
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Turso veritabanı kurulumu tamamlandı.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Turso veritabanı kurulumu başarısız:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase; 