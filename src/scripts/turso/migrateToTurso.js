const setupTursoDb = require('../../config/setupTursoDb');
const fetchCountries = require('./fetchCountriesForTurso');
const fetchStates = require('./fetchStatesForTurso');
const fetchCities = require('./fetchCitiesForTurso');
const { client } = require('../../config/turso');

async function migrateToTurso() {
    try {
        console.log('Turso veritabanına geçiş işlemi başlıyor...');
        
        // 1. Veritabanı şemasını oluştur
        console.log('1. Adım: Veritabanı şeması oluşturuluyor...');
        await setupTursoDb();
        console.log('Veritabanı şeması oluşturuldu!');
        
        // 2. Ülke verilerini çek ve kaydet
        console.log('\n2. Adım: Ülke verileri çekiliyor ve kaydediliyor...');
        await fetchCountries();
        console.log('Ülke verileri kaydedildi!');
        
        // 3. Şehir verilerini çek ve kaydet
        console.log('\n3. Adım: Şehir verileri çekiliyor ve kaydediliyor...');
        await fetchStates();
        console.log('Şehir verileri kaydedildi!');
        
        // 4. İlçe verilerini çek ve kaydet
        console.log('\n4. Adım: İlçe verileri çekiliyor ve kaydediliyor...');
        await fetchCities();
        console.log('İlçe verileri kaydedildi!');
        
        // 5. Veri sayılarını kontrol et
        console.log('\n5. Adım: Veri sayıları kontrol ediliyor...');
        const countriesCount = await client.execute('SELECT COUNT(*) as count FROM countries');
        const statesCount = await client.execute('SELECT COUNT(*) as count FROM states');
        const citiesCount = await client.execute('SELECT COUNT(*) as count FROM cities');
        
        console.log(`Ülke sayısı: ${countriesCount.rows[0].count}`);
        console.log(`Şehir sayısı: ${statesCount.rows[0].count}`);
        console.log(`İlçe sayısı: ${citiesCount.rows[0].count}`);
        
        console.log('\nTurso veritabanına geçiş işlemi başarıyla tamamlandı!');
    } catch (error) {
        console.error('Turso veritabanına geçiş sırasında hata:', error.message);
    }
}

// Scripti çalıştır
if (require.main === module) {
    migrateToTurso()
        .then(() => {
            console.log('İşlem tamamlandı.');
            process.exit(0);
        })
        .catch(err => {
            console.error('İşlem sırasında hata oluştu:', err);
            process.exit(1);
        });
}

module.exports = migrateToTurso; 