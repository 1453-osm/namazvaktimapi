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
    
    // Countries tablosunun varlığını kontrol et
    const countriesExists = tables.rows.some(row => row.name === 'countries');
    if (!countriesExists) {
      console.log('Ülkeler tablosu bulunamadı, oluşturuluyor...');
      
      // Ülkeler tablosunu oluştur
      await execute(`
        CREATE TABLE countries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Ülkeler tablosu oluşturuldu');
    }
    
    // States tablosunun varlığını kontrol et
    const statesExists = tables.rows.some(row => row.name === 'states');
    if (!statesExists) {
      console.log('Şehirler tablosu bulunamadı, oluşturuluyor...');
      
      // Şehirler tablosunu oluştur
      await execute(`
        CREATE TABLE states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          country_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (country_id) REFERENCES countries(id)
        )
      `);
      console.log('Şehirler tablosu oluşturuldu');
    }
    
    // Cities tablosunun varlığını kontrol et
    const citiesExists = tables.rows.some(row => row.name === 'cities');
    if (!citiesExists) {
      console.log('İlçeler tablosu bulunamadı, oluşturuluyor...');
      
      // İlçeler tablosunu oluştur
      await execute(`
        CREATE TABLE cities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          state_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (state_id) REFERENCES states(id)
        )
      `);
      console.log('İlçeler tablosu oluşturuldu');
    }
    
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
      message: 'Şema kontrolü tamamlandı ve eksik tablolar oluşturuldu'
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