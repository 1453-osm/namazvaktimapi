const { execute } = require('../config/turso');

/**
 * Veritabanı şemasını kontrol eder ve gerekirse oluşturur
 */
async function checkAndCreateSchema() {
  try {
    console.log('Veritabanı şeması kontrol ediliyor...');
    
    // Tablo listesini kontrol et
    const tables = await execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Mevcut tablolar:', tables.rows.map(row => row.name));
    
    // Prayer Times tablosunun varlığını kontrol et
    const prayerTimesExists = tables.rows.some(row => row.name === 'prayer_times');
    if (!prayerTimesExists) {
      console.log('Namaz vakitleri tablosu bulunamadı, oluşturuluyor...');
      
      // Namaz vakitleri tablosunu oluştur
      await execute(`
        CREATE TABLE prayer_times (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city_id INTEGER NOT NULL,
          date DATE NOT NULL,
          fajr TEXT,
          sunrise TEXT,
          dhuhr TEXT,
          asr TEXT,
          maghrib TEXT,
          isha TEXT,
          qibla TEXT,
          gregorian_date TEXT,
          hijri_date TEXT,
          gregorian_date_short TEXT,
          gregorian_date_long TEXT,
          gregorian_date_iso8601 TEXT,
          gregorian_date_short_iso8601 TEXT,
          hijri_date_short TEXT,
          hijri_date_long TEXT,
          hijri_date_short_iso8601 TEXT,
          hijri_date_long_iso8601 TEXT,
          astronomical_sunset TEXT,
          astronomical_sunrise TEXT,
          qibla_time TEXT,
          greenwich_mean_timezone TEXT,
          shape_moon_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(city_id, date)
        )
      `);
      console.log('Namaz vakitleri tablosu oluşturuldu');
    }
    
    // Eid Times tablosunun varlığını kontrol et
    const eidTimesExists = tables.rows.some(row => row.name === 'eid_times');
    if (!eidTimesExists) {
      console.log('Bayram vakitleri tablosu bulunamadı, oluşturuluyor...');
      
      // Bayram vakitleri tablosunu oluştur
      await execute(`
        CREATE TABLE eid_times (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          city_id INTEGER NOT NULL,
          eid_date DATE NOT NULL,
          eid_time TEXT NOT NULL,
          eid_type TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(city_id, eid_date, eid_type)
        )
      `);
      console.log('Bayram vakitleri tablosu oluşturuldu');
    }
    
    return {
      success: true,
      message: 'Şema kontrolü tamamlandı'
    };
  } catch (error) {
    console.error('Şema kontrolü sırasında hata:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  checkAndCreateSchema
}; 