const diyanetService = require('../services/diyanetService');
const { pool } = require('../config/db');

async function fetchAndSaveCities() {
    try {
        console.log('Veritabanı bağlantısı başlatılıyor...');
        
        // Önce şehir ID'lerini veritabanından çek
        console.log('Şehirler veritabanından çekiliyor...');
        const statesResult = await pool.query('SELECT id, country_id, code, name FROM states');
        const states = statesResult.rows;
        console.log(`${states.length} şehir bulundu.`);

        // Her şehir için ilçeleri çek
        for (const state of states) {
            console.log(`\n${state.name} (ID: ${state.id}) için ilçeler çekiliyor...`);
            
            try {
                console.log('API isteği gönderiliyor...');
                const response = await diyanetService.getCities(state.id);
                console.log('API yanıtı alındı.');
                
                // Detaylı hata ayıklama
                console.log('API yanıtı detayları:', JSON.stringify(response).substring(0, 500)); // ilk 500 karakteri logla
                
                if (!response || !response.data) {
                    console.error(`API yanıtı geçersiz: ${JSON.stringify(response)}`);
                    continue;
                }
                
                const cities = Array.isArray(response.data) ? response.data : [];
                console.log(`${state.name} için ${cities.length} ilçe bulundu.`);

                if (cities.length === 0) {
                    console.log('İlçe verisi bulunamadı, bir sonraki şehre geçiliyor.');
                    continue;
                }

                // Veritabanına kaydet
                console.log('İlçeler veritabanına kaydediliyor...');
                for (const city of cities) {
                    if (!city || !city.id) {
                        console.log('Geçersiz ilçe verisi, atlanıyor:', city);
                        continue;
                    }
                    
                    console.log(`İlçe kaydediliyor: ${city.name} (ID: ${city.id})`);
                    await pool.query(
                        'INSERT INTO cities (id, state_id, code, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET state_id = $2, code = $3, name = $4',
                        [city.id, state.id, city.code || '', city.name]
                    );
                }
                console.log(`${state.name} için ilçeler başarıyla kaydedildi.`);
            } catch (error) {
                console.error(`${state.name} için ilçeler çekilirken hata oluştu:`, error.message);
                if (error.response) {
                    console.error('API yanıt detayları:', error.response?.data);
                }
                continue; // Hata olsa bile diğer şehirlere devam et
            }

            // API istek sınırını aşmamak için kısa bir bekleme
            console.log('2 saniye bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\nTüm ilçe verileri işlemi tamamlandı.');
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
fetchAndSaveCities(); 