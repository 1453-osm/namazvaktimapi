const diyanetService = require('../services/diyanetService');
const { pool } = require('../config/db');

async function fetchAndSaveStates() {
    try {
        console.log('Veritabanı bağlantısı başlatılıyor...');
        
        // Önce ülke ID'lerini veritabanından çek
        console.log('Ülkeler veritabanından çekiliyor...');
        const countriesResult = await pool.query('SELECT id, code, name FROM countries');
        const countries = countriesResult.rows;
        console.log(`${countries.length} ülke bulundu:`, countries);

        // Her ülke için şehirleri çek
        for (const country of countries) {
            console.log(`\n${country.name} (${country.code}) için şehirler çekiliyor...`);
            console.log(`Ülke ID: ${country.id}`);
            
            try {
                console.log('API isteği gönderiliyor...');
                const response = await diyanetService.getStates(country.id);
                console.log('API yanıtı alındı:', response);
                
                const states = response.data;
                console.log(`${country.name} için ${states.length} şehir bulundu:`, states);

                // Veritabanına kaydet
                console.log('Şehirler veritabanına kaydediliyor...');
                for (const state of states) {
                    console.log(`Şehir kaydediliyor: ${state.name} (ID: ${state.id})`);
                    await pool.query(
                        'INSERT INTO states (id, country_id, code, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET country_id = $2, code = $3, name = $4',
                        [state.id, country.id, state.code, state.name]
                    );
                }
                console.log(`${country.name} için şehirler başarıyla kaydedildi.`);
            } catch (error) {
                console.error(`${country.name} için şehirler çekilirken hata oluştu:`, error.message);
                if (error.response) {
                    console.error('API yanıt detayları:', error.response.data);
                }
                continue; // Hata olsa bile diğer ülkelere devam et
            }

            // API istek sınırını aşmamak için kısa bir bekleme
            console.log('1 saniye bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\nTüm şehir verileri işlemi tamamlandı.');
    } catch (error) {
        console.error('Genel hata:', error.message);
        if (error.response) {
            console.error('API yanıt detayları:', error.response.data);
        }
    } finally {
        console.log('Veritabanı bağlantısı kapatılıyor...');
        await pool.end();
    }
}

// Scripti çalıştır
console.log('Script başlatılıyor...');
fetchAndSaveStates(); 