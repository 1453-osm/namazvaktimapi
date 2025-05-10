const diyanetService = require('../services/diyanetService');
const { pool } = require('../config/db');

// Tarih yardımcı fonksiyonları
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

async function fetchAndSavePrayerTimes() {
    // Bir veritabanı client'ı oluştur
    const client = await pool.connect();
    
    try {
        console.log('Veritabanı bağlantısı başlatılıyor...');
        console.log('Bağlantı URL:', process.env.DATABASE_URL ? 'Çevresel değişken tanımlanmış' : 'Çevresel değişken tanımlanmamış, varsayılan bağlantı kullanılıyor');
        
        // Veritabanı bağlantısını test et
        try {
            const testQuery = await client.query('SELECT NOW() as current_time');
            console.log('Veritabanı bağlantısı başarılı!');
            console.log('Sunucu zamanı:', testQuery.rows[0].current_time);
            
            // Mevcut prayer_times tablosunu kontrol et
            const prayerTimesCheck = await client.query('SELECT COUNT(*) FROM prayer_times');
            console.log(`Mevcut namaz vakitleri sayısı: ${prayerTimesCheck.rows[0].count}`);
        } catch (dbError) {
            console.error('HATA: Veritabanı bağlantısı sağlanamadı:', dbError.message);
            throw new Error('Veritabanı bağlantısı kurulamadı');
        }
        
        // Transaction başlat
        await client.query('BEGIN');
        
        // İlçeleri veritabanından çek
        console.log('İlçeler veritabanından çekiliyor...');
        const citiesResult = await client.query(`
            SELECT c.id, c.name as city_name, c.state_id, s.name as state_name
            FROM cities c
            JOIN states s ON c.state_id = s.id
            ORDER BY s.name, c.name
        `);
        
        const cities = citiesResult.rows;
        console.log(`${cities.length} ilçe bulundu.`);
        
        if (cities.length === 0) {
            console.error('İlçe verisi bulunamadı. Önce ilçe verilerini çekmelisiniz.');
            await client.query('ROLLBACK');
            return;
        }
        
        // Test için sınırlı sayıda ilçe ile çalış (örn. ilk 5 ilçe)
        const limitedCities = cities.slice(0, 5);
        console.log(`Test için ilk ${limitedCities.length} ilçe ile çalışılıyor.`);
        
        // İşlem istatistikleri
        let totalSuccess = 0;
        let totalFailed = 0;
        let totalPrayerTimesAdded = 0;
        
        // Bugünden başlayarak 1 yıllık aralık
        const today = new Date();
        const oneYearLater = addMonths(today, 12);
        
        console.log(`Tarih aralığı: ${formatDate(today)} - ${formatDate(oneYearLater)}`);
        
        // Her ilçe için namaz vakitlerini çek
        for (const city of limitedCities) {
            console.log(`\n${city.state_name} - ${city.city_name} (ID: ${city.id}) için namaz vakitleri çekiliyor...`);
            
            try {
                // Her ilçe için tarih aralığındaki namaz vakitlerini al
                console.log('API isteği gönderiliyor...');
                const response = await diyanetService.getPrayerTimesByDateRange(
                    city.id,
                    formatDate(today),
                    formatDate(oneYearLater)
                );
                
                if (!response || !response.data) {
                    console.error(`API yanıtı geçersiz: ${JSON.stringify(response).substring(0, 200)}...`);
                    totalFailed++;
                    continue;
                }
                
                const prayerTimes = Array.isArray(response.data) ? response.data : [];
                console.log(`${city.city_name} için ${prayerTimes.length} günlük namaz vakti bulundu.`);
                
                if (prayerTimes.length === 0) {
                    console.log('Namaz vakti verisi bulunamadı, bir sonraki ilçeye geçiliyor.');
                    totalFailed++;
                    continue;
                }
                
                // Test için sadece 5 günlük veri alalım
                const limitedPrayerTimes = prayerTimes.slice(0, 5);
                console.log(`Test için ilk ${limitedPrayerTimes.length} gün işlenecek.`);
                
                let daySuccess = 0;
                
                // Veritabanına kaydet
                console.log('Namaz vakitleri veritabanına kaydediliyor...');
                for (const prayerTime of limitedPrayerTimes) {
                    try {
                        console.log('İşlenen namaz vakti:', JSON.stringify(prayerTime).substring(0, 100));
                        
                        // API yanıt yapısına göre bu alanları extract et
                        const {
                            MiladiTarih, // String olarak tarih
                            Imsak,
                            Gunes,
                            Ogle,
                            Ikindi,
                            Aksam,
                            Yatsi
                        } = prayerTime;
                        
                        // String tarihini parse et
                        // Format: "18.05.2023" (gün.ay.yıl)
                        const dateParts = MiladiTarih.split('.');
                        if (dateParts.length !== 3) {
                            console.error(`Geçersiz tarih formatı: ${MiladiTarih}`);
                            continue;
                        }
                        
                        const prayerDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // YYYY-MM-DD formatına çevir
                        
                        console.log(`Namaz vakti kaydediliyor: ${city.city_name} için ${prayerDate}`);
                        console.log(`Vakitler: Imsak=${Imsak}, Gunes=${Gunes}, Ogle=${Ogle}, Ikindi=${Ikindi}, Aksam=${Aksam}, Yatsi=${Yatsi}`);
                        
                        // Veritabanına kaydet
                        const insertQuery = `
                            INSERT INTO prayer_times
                             (city_id, date, fajr, sunrise, dhuhr, asr, maghrib, isha)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                             ON CONFLICT (city_id, date) 
                             DO UPDATE SET 
                                fajr = $3, 
                                sunrise = $4, 
                                dhuhr = $5, 
                                asr = $6, 
                                maghrib = $7, 
                                isha = $8
                             RETURNING id
                        `;
                        
                        const values = [
                            city.id,
                            prayerDate,
                            Imsak,
                            Gunes,
                            Ogle,
                            Ikindi,
                            Aksam,
                            Yatsi
                        ];
                        
                        console.log('SQL sorgusu çalıştırılıyor...');
                        const insertResult = await client.query(insertQuery, values);
                        
                        console.log('Sorgu sonucu:', JSON.stringify(insertResult.rows));
                        
                        if (insertResult.rows.length > 0) {
                            console.log(`Kayıt başarılı. ID: ${insertResult.rows[0].id}`);
                            daySuccess++;
                        } else {
                            console.error('Kayıt başarısız: Sonuç boş');
                        }
                    } catch (insertError) {
                        console.error(`Namaz vakti kaydedilirken hata:`, insertError.message);
                        console.error('Tam hata:', insertError);
                    }
                }
                
                // Her ilçe sonrası ara commit
                await client.query('COMMIT');
                await client.query('BEGIN');
                
                console.log(`${city.city_name} için ${daySuccess}/${limitedPrayerTimes.length} namaz vakti kaydedildi.`);
                totalPrayerTimesAdded += daySuccess;
                
                if (daySuccess > 0) {
                    totalSuccess++;
                } else {
                    totalFailed++;
                }
            } catch (error) {
                console.error(`${city.city_name} için namaz vakitleri çekilirken hata:`, error.message);
                if (error.response) {
                    console.error('API yanıt detayları:', error.response?.data);
                }
                totalFailed++;
                continue;
            }
            
            // API istek sınırını aşmamak için kısa bir bekleme
            console.log('3 saniye bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Son commit işlemi
        await client.query('COMMIT');
        
        console.log('\nTüm namaz vakitleri işlemi tamamlandı.');
        console.log(`Toplam ${limitedCities.length} ilçeden, ${totalSuccess} ilçe için işlem başarılı, ${totalFailed} ilçe için başarısız oldu.`);
        console.log(`Toplam ${totalPrayerTimesAdded} namaz vakti kaydedildi.`);
        
        // Son durumu kontrol et
        const finalCheck = await client.query('SELECT COUNT(*) FROM prayer_times');
        console.log(`Veritabanında toplam ${finalCheck.rows[0].count} namaz vakti kaydı bulunuyor.`);
        
    } catch (error) {
        console.error('Genel hata:', error.message);
        if (error.stack) {
            console.error('Hata stack:', error.stack);
        }
        
        // Hata durumunda rollback yap
        await client.query('ROLLBACK');
    } finally {
        console.log('Veritabanı bağlantısı kapatılıyor...');
        client.release();
        await pool.end();
    }
}

// Scripti çalıştır
console.log('Script başlatılıyor...');
fetchAndSavePrayerTimes(); 