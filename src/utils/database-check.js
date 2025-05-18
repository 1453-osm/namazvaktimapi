const { execute } = require('../config/turso');

async function checkTables() {
  try {
    console.log('Veritabanı tabloları kontrol ediliyor...');
    
    // SQLite'da tablo listesini al
    const tables = await execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Mevcut tablolar:', tables.rows.map(row => row.name));
    
    // Ülkeler tablosu yapısını kontrol et
    if (tables.rows.some(row => row.name === 'countries')) {
      const countries = await execute("PRAGMA table_info(countries)");
      console.log('\nÜlkeler tablosu yapısı:');
      countries.rows.forEach(col => {
        console.log(`  ${col.name} (${col.type})`);
      });
    }
    
    // Şehirler tablosu yapısını kontrol et
    if (tables.rows.some(row => row.name === 'states')) {
      const states = await execute("PRAGMA table_info(states)");
      console.log('\nŞehirler tablosu yapısı:');
      states.rows.forEach(col => {
        console.log(`  ${col.name} (${col.type})`);
      });
    }
    
    // İlçeler tablosu yapısını kontrol et
    if (tables.rows.some(row => row.name === 'cities')) {
      const cities = await execute("PRAGMA table_info(cities)");
      console.log('\nİlçeler tablosu yapısı:');
      cities.rows.forEach(col => {
        console.log(`  ${col.name} (${col.type})`);
      });
    }
    
    // Namaz vakitleri tablosu yapısını kontrol et
    if (tables.rows.some(row => row.name === 'prayer_times')) {
      const prayerTimes = await execute("PRAGMA table_info(prayer_times)");
      console.log('\nNamaz vakitleri tablosu yapısı:');
      prayerTimes.rows.forEach(col => {
        console.log(`  ${col.name} (${col.type})`);
      });
    }
    
    // Veritabanında örnek veri göster
    if (tables.rows.some(row => row.name === 'countries')) {
      const sampleCountries = await execute("SELECT * FROM countries LIMIT 5");
      console.log('\nÖrnek ülkeler:', sampleCountries.rows);
    }
    
    if (tables.rows.some(row => row.name === 'states')) {
      const sampleStates = await execute("SELECT * FROM states LIMIT 5");
      console.log('\nÖrnek şehirler:', sampleStates.rows);
    }
    
    if (tables.rows.some(row => row.name === 'cities')) {
      const sampleCities = await execute("SELECT * FROM cities LIMIT 5");
      console.log('\nÖrnek ilçeler:', sampleCities.rows);
    }

  } catch (error) {
    console.error('Veritabanı kontrolü sırasında hata:', error);
  }
}

// Fonksiyonu çalıştır
checkTables()
  .then(() => {
    console.log('Veritabanı kontrolü tamamlandı.');
    process.exit(0);
  })
  .catch(err => {
    console.error('İşlem sırasında hata:', err);
    process.exit(1);
  }); 