const diyanetService = require('../services/diyanetService');
const { pool } = require('../config/db');

async function fetchAndSaveCities() {
    try {
        console.log('Veritabanı bağlantısı başlatılıyor...');
        console.log('Bağlantı URL:', process.env.DATABASE_URL || 'Çevresel değişken tanımlanmamış, varsayılan bağlantı kullanılıyor');
        
        // Veritabanı bağlantısını test et
        try {
            const testQuery = await pool.query('SELECT NOW() as current_time');
            console.log('Veritabanı bağlantısı başarılı!');
            console.log('Sunucu zamanı:', testQuery.rows[0].current_time);
        } catch (dbError) {
            console.error('HATA: Veritabanı bağlantısı sağlanamadı:', dbError.message);
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }
        
        // cities tablosunun varlığını kontrol et
        try {
            await pool.query('SELECT COUNT(*) FROM cities LIMIT 1');
            console.log('cities tablosu mevcut');
        } catch (tableError) {
            console.error('HATA: cities tablosu bulunamadı:', tableError.message);
            throw new Error('cities tablosu mevcut değil');
        }
        
        // Önce şehir ID'lerini veritabanından çek
        console.log('Şehirler veritabanından çekiliyor...');
        let statesResult;
        try {
            statesResult = await pool.query('SELECT id, country_id, code, name FROM states');
        } catch (statesError) {
            console.error('HATA: Şehirler veritabanından çekilirken hata oluştu:', statesError.message);
            throw new Error('Şehir verileri çekilemedi');
        }
        
        const states = statesResult.rows;
        console.log(`${states.length} şehir bulundu.`);
        
        // Test için sınırlı sayıda şehir ile çalış (örn. ilk 3 şehir)
        // const limitedStates = states.slice(0, 3);
        // console.log(`Test için ilk ${limitedStates.length} şehir ile çalışılıyor.`);
        
        let totalSuccess = 0;
        let totalFailed = 0;
        let totalCities = 0;

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
                    totalFailed++;
                    continue;
                }
                
                const cities = Array.isArray(response.data) ? response.data : [];
                console.log(`${state.name} için ${cities.length} ilçe bulundu.`);

                if (cities.length === 0) {
                    console.log('İlçe verisi bulunamadı, bir sonraki şehre geçiliyor.');
                    totalFailed++;
                    continue;
                }
                
                totalCities += cities.length;
                let citySuccess = 0;

                // Veritabanına kaydet
                console.log('İlçeler veritabanına kaydediliyor...');
                for (const city of cities) {
                    if (!city || !city.id) {
                        console.log('Geçersiz ilçe verisi, atlanıyor:', city);
                        continue;
                    }
                    
                    console.log(`İlçe kaydediliyor: ${city.name} (ID: ${city.id})`);
                    try {
                        const insertResult = await pool.query(
                            'INSERT INTO cities (id, state_id, code, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET state_id = $2, code = $3, name = $4 RETURNING id',
                            [city.id, state.id, city.code || '', city.name]
                        );
                        
                        if (insertResult.rows.length > 0) {
                            console.log(`İlçe başarıyla kaydedildi. Kayıt ID: ${insertResult.rows[0].id}`);
                            citySuccess++;
                        } else {
                            console.error('İlçe kaydedilemedi: Sorgu sonucu boş.');
                        }
                    } catch (insertError) {
                        console.error(`İlçe kaydedilirken hata oluştu:`, insertError.message);
                    }
                }
                
                console.log(`${state.name} için ${citySuccess}/${cities.length} ilçe başarıyla kaydedildi.`);
                
                if (citySuccess > 0) {
                    totalSuccess++;
                } else {
                    totalFailed++;
                }
            } catch (error) {
                console.error(`${state.name} için ilçeler çekilirken hata oluştu:`, error.message);
                if (error.response) {
                    console.error('API yanıt detayları:', error.response?.data);
                }
                totalFailed++;
                continue; // Hata olsa bile diğer şehirlere devam et
            }

            // API istek sınırını aşmamak için kısa bir bekleme
            console.log('2 saniye bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\nTüm ilçe verileri işlemi tamamlandı.');
        console.log(`Toplam ${states.length} şehirden, ${totalSuccess} şehir için işlem başarılı, ${totalFailed} şehir için başarısız oldu.`);
        console.log(`Toplam ${totalCities} ilçe verisi işlendi.`);
        
        // Son durumu kontrol et
        const finalCheck = await pool.query('SELECT COUNT(*) FROM cities');
        console.log(`Veritabanında toplam ${finalCheck.rows[0].count} ilçe kaydı bulunuyor.`);
        
    } catch (error) {
        console.error('Genel hata:', error.message);
        if (error.response) {
            console.error('API yanıt detayları:', error.response.data);
        }
        if (error.stack) {
            console.error('Hata stack:', error.stack);
        }
    } finally {
        console.log('Veritabanı bağlantısı kapatılıyor...');
        await pool.end();
    }
}

// Scripti çalıştır
console.log('Script başlatılıyor...');
fetchAndSaveCities(); 