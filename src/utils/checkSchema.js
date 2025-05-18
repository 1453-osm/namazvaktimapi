const { execute } = require('../config/turso');

/**
 * Bir tablonun şemasını görüntüleyen yardımcı fonksiyon
 */
async function inspectTableSchema(tableName) {
  try {
    console.log(`Tablo şeması inceleniyor: ${tableName}`);
    
    // Tablo yapısını kontrol et
    const pragmaResult = await execute(`PRAGMA table_info(${tableName})`);
    
    if (pragmaResult && pragmaResult.rows && pragmaResult.rows.length > 0) {
      console.log(`${tableName} tablosu sütunları:`);
      
      pragmaResult.rows.forEach(column => {
        console.log(`- ${column.name} (${column.type})${column.pk ? ' PRIMARY KEY' : ''}${column.notnull ? ' NOT NULL' : ''}`);
      });
      
      // İlişkileri kontrol et
      try {
        const foreignKeys = await execute(`PRAGMA foreign_key_list(${tableName})`);
        
        if (foreignKeys && foreignKeys.rows && foreignKeys.rows.length > 0) {
          console.log(`${tableName} tablosu ilişkileri:`);
          
          foreignKeys.rows.forEach(fk => {
            console.log(`- ${fk.from} -> ${fk.table}.${fk.to}`);
          });
        } else {
          console.log(`${tableName} tablosunda tanımlı ilişki bulunamadı.`);
        }
      } catch (fkError) {
        console.error(`İlişki kontrolü hatası:`, fkError.message);
      }
      
      // Tablo verilerini örnek olarak göster (ilk 5 satır)
      try {
        const sampleData = await execute(`SELECT * FROM ${tableName} LIMIT 5`);
        
        if (sampleData && sampleData.rows && sampleData.rows.length > 0) {
          console.log(`${tableName} tablosu örnek veriler (ilk ${sampleData.rows.length} satır):`);
          console.log(JSON.stringify(sampleData.rows, null, 2));
        } else {
          console.log(`${tableName} tablosunda veri bulunamadı.`);
        }
      } catch (dataError) {
        console.error(`Veri örneği hatası:`, dataError.message);
      }
      
      return {
        success: true,
        columns: pragmaResult.rows,
        message: `${tableName} tablosu şeması kontrol edildi.`
      };
    } else {
      console.log(`${tableName} tablosu bulunamadı veya boş şema.`);
      return {
        success: false,
        message: `${tableName} tablosu bulunamadı veya boş şema.`
      };
    }
  } catch (error) {
    console.error(`Tablo şeması inceleme hatası (${tableName}):`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

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
    
    // Mevcut tablo şemalarını incele
    for (const table of ['countries', 'states', 'cities', 'prayer_times', 'eid_times']) {
      if (tables.rows.some(row => row.name === table)) {
        await inspectTableSchema(table);
      }
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
  checkAndCreateSchema,
  inspectTableSchema
}; 