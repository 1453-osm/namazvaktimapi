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
        
        // İlçeleri veritabanından çek
        console.log('İlçeler veritabanından çekiliyor...');
        const citiesResult = await pool.query(`
            SELECT c.id, c.name as city_name, c.state_id, s.name as state_name
            FROM cities c
            JOIN states s ON c.state_id = s.id
            ORDER BY s.name, c.name
        `);
        
        const cities = citiesResult.rows;
        console.log(`${cities.length} ilçe bulundu.`);
        
        if (cities.length === 0) {
            console.error('İlçe verisi bulunamadı. Önce ilçe verilerini çekmelisiniz.');
            return;
        }
        
        // Test için sınırlı sayıda ilçe ile çalış (örn. ilk 3 ilçe)
        // const limitedCities = cities.slice(0, 3);
        // console.log(`Test için ilk ${limitedCities.length} ilçe ile çalışılıyor.`);
        
        // İşlem istatistikleri
        let totalSuccess = 0;
        let totalFailed = 0;
        let totalPrayerTimesAdded = 0;
        
        // Bugünden başlayarak 1 yıllık aralık
        const today = new Date();
        const oneYearLater = addMonths(today, 12);
        
        console.log(`Tarih aralığı: ${formatDate(today)} - ${formatDate(oneYearLater)}`);
        
        // Her ilçe için namaz vakitlerini çek
        for (const city of cities) {
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
                
                let daySuccess = 0;
                
                // Veritabanına kaydet
                console.log('Namaz vakitleri veritabanına kaydediliyor...');
                for (const prayerTime of prayerTimes) {
                    try {
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
                        
                        // Veritabanına kaydet
                        const insertResult = await pool.query(
                            `INSERT INTO prayer_times
                             (city_id, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                             ON CONFLICT (city_id, prayer_date) 
                             DO UPDATE SET 
                                fajr = $3, 
                                sunrise = $4, 
                                dhuhr = $5, 
                                asr = $6, 
                                maghrib = $7, 
                                isha = $8
                             RETURNING id`,
                            [
                                city.id,
                                prayerDate,
                                Imsak,
                                Gunes,
                                Ogle,
                                Ikindi,
                                Aksam,
                                Yatsi
                            ]
                        );
                        
                        if (insertResult.rows.length > 0) {
                            daySuccess++;
                        }
                    } catch (insertError) {
                        console.error(`Namaz vakti kaydedilirken hata:`, insertError.message);
                    }
                }
                
                console.log(`${city.city_name} için ${daySuccess}/${prayerTimes.length} namaz vakti kaydedildi.`);
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
        
        console.log('\nTüm namaz vakitleri işlemi tamamlandı.');
        console.log(`Toplam ${cities.length} ilçeden, ${totalSuccess} ilçe için işlem başarılı, ${totalFailed} ilçe için başarısız oldu.`);
        console.log(`Toplam ${totalPrayerTimesAdded} namaz vakti kaydedildi.`);
        
        // Son durumu kontrol et
        const finalCheck = await pool.query('SELECT COUNT(*) FROM prayer_times');
        console.log(`Veritabanında toplam ${finalCheck.rows[0].count} namaz vakti kaydı bulunuyor.`);
        
    } catch (error) {
        console.error('Genel hata:', error.message);
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
fetchAndSavePrayerTimes(); 