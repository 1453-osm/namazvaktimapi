// PostgreSQL yerine Turso veritabanı kullanıyoruz
const tursoDb = require('./turso');

// Veritabanı sorguları için yardımcı fonksiyon
const query = async (sql, params = []) => {
  try {
    const result = await tursoDb.execute(sql, params);
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    console.error('Veritabanı sorgu hatası:', error.message);
    console.error('Sorgu:', sql);
    console.error('Parametreler:', params);
    throw error;
    }
};

// Bağlantıyı test etme yardımcı fonksiyonu
const testConnection = async () => {
  try {
    console.log('Veritabanı bağlantısı test ediliyor...');
    return await tursoDb.testConnection();
  } catch (err) {
    console.error('Veritabanı bağlantı testi başarısız:', err.message);
    return false;
  }
};

module.exports = {
  query,
  testConnection
}; 