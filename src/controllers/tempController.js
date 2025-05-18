const db = require('../config/db');

// Geçici olarak tablo şemasını öğrenmek için kullanılacak
const checkPrayerTimesTable = async (req, res) => {
  try {
    console.log('=== PRAYER_TIMES TABLO SORGUSU BAŞLADI ===');
    
    // Tablo yapısını sorgula
    const query = `PRAGMA table_info(prayer_times)`;
    const result = await db.query(query);
    
    console.log('Tablo bilgisi sonuçları:', result);
    
    // Tablodaki mevcut verileri kontrol et 
    const dataQuery = `SELECT * FROM prayer_times LIMIT 1`;
    const dataResult = await db.query(dataQuery);
    
    console.log('Veri sonuçları:', dataResult);
    
    return res.json({
      status: 'success',
      schema: result.rows,
      data: dataResult.rows
    });
  } catch (error) {
    console.error('Tablo kontrolü hatası:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  checkPrayerTimesTable
}; 