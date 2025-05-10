const diyanetApi = require('../utils/diyanetApi');
const prayerTimeModel = require('../models/prayerTimeModel');
const locationModel = require('../models/locationModel');
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

// Bekle fonksiyonu - istek limitleri için gecikme sağlar
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Tarih aralığını aylık dilimlere böl
function splitDateRangeByMonth(startDate, endDate) {
    const ranges = [];
    let currentStart = new Date(startDate);
    
    while (currentStart < new Date(endDate)) {
        // Ay sonu hesapla
        let monthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0);
        
        // Eğer endDate'den sonraysa, endDate'i kullan
        if (monthEnd > new Date(endDate)) {
            monthEnd = new Date(endDate);
        }
        
        ranges.push({
            start: formatDate(currentStart),
            end: formatDate(monthEnd)
        });
        
        // Bir sonraki ayın başına geç
        currentStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
    }
    
    return ranges;
}

async function fetchAndSavePrayerTimes() {
    // Bir veritabanı client'ı oluştur
    const client = await pool.connect();
    
    try {
        console.log('Veritabanı bağlantısı başlatılıyor...');
        
        // Veritabanı bağlantısını test et
        const testQuery = await client.query('SELECT NOW() as current_time');
        console.log('Veritabanı bağlantısı başarılı!');
        console.log('Sunucu zamanı:', testQuery.rows[0].current_time);
        
        // Mevcut prayer_times tablosunu kontrol et
        const prayerTimesCheck = await client.query('SELECT COUNT(*) FROM prayer_times');
        console.log(`Mevcut namaz vakitleri sayısı: ${prayerTimesCheck.rows[0].count}`);
        
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
        
        // API'den desteklenen tarih aralığını al
        console.log('Diyanet API tarih aralığı alınıyor...');
        const dateRangeResponse = await diyanetApi.getPrayerTimeDateRange();
        
        if (!dateRangeResponse || !dateRangeResponse.isSuccess || !dateRangeResponse.data) {
            console.error('Tarih aralığı alınamadı:', dateRangeResponse);
            await client.query('ROLLBACK');
            return;
        }
        
        const { startDate, endDate } = dateRangeResponse.data;
        console.log(`API desteklenen tarih aralığı: ${startDate} - ${endDate}`);
        
        // Tarih aralığını aylık dilimlere böl
        const dateRanges = splitDateRangeByMonth(startDate, endDate);
        console.log(`Tarih aralığı ${dateRanges.length} aylık dilime bölündü.`);
        
        // İşlem istatistikleri
        let totalSuccess = 0;
        let totalFailed = 0;
        let totalPrayerTimesAdded = 0;
        let processedCities = 0;
        
        // Her ilçe için namaz vakitlerini çek
        for (const city of cities) {
            processedCities++;
            console.log(`\n[${processedCities}/${cities.length}] ${city.state_name} - ${city.city_name} (ID: ${city.id}) için namaz vakitleri çekiliyor...`);
            
            try {
                let citySuccess = 0;
                let cityTotal = 0;
                
                // Her ay için ayrı istek yap - API istek sınırlarına uymak için
                for (const range of dateRanges) {
                    console.log(`Tarih aralığı: ${range.start} - ${range.end} için veri çekiliyor...`);
                    
                    try {
                        // API isteği gönder
                        const response = await diyanetApi.getPrayerTimesByDateRangeAndCity(
                            city.id, 
                            range.start,
                            range.end
                        );
                        
                        if (!response || !response.isSuccess || !response.data) {
                            console.error(`API yanıtı başarısız oldu: ${JSON.stringify(response)}`);
                            continue;
                        }
                        
                        const prayerTimes = response.data;
                        console.log(`${prayerTimes.length} günlük namaz vakti bulundu.`);
                        
                        if (prayerTimes.length === 0) {
                            console.log('Namaz vakti verisi bulunamadı, sonraki tarih aralığına geçiliyor.');
                            continue;
                        }
                        
                        // Veritabanına kaydet
                        let savedCount = 0;
                        for (const prayerTime of prayerTimes) {
                            try {
                                // Veritabanına kaydet
                                await prayerTimeModel.createPrayerTime(
                                    parseInt(city.id),
                                    prayerTime.date,
                                    prayerTime.fajr,
                                    prayerTime.sunrise,
                                    prayerTime.dhuhr,
                                    prayerTime.asr,
                                    prayerTime.maghrib,
                                    prayerTime.isha,
                                    prayerTime.qibla || null,
                                    prayerTime.gregorianDate || prayerTime.date,
                                    prayerTime.hijriDate || null
                                );
                                
                                savedCount++;
                                citySuccess++;
                                totalPrayerTimesAdded++;
                            } catch (insertError) {
                                console.error(`Namaz vakti kaydedilirken hata: ${insertError.message}`);
                            }
                        }
                        
                        cityTotal += prayerTimes.length;
                        console.log(`${savedCount}/${prayerTimes.length} namaz vakti başarıyla kaydedildi.`);
                        
                        // Her istek arasında bekle (API istek sınırı için)
                        await sleep(1500);
                    } catch (rangeError) {
                        console.error(`Tarih aralığı için hata: ${rangeError.message}`);
                    }
                }
                
                // Ara commit
                await client.query('COMMIT');
                await client.query('BEGIN');
                
                console.log(`${city.city_name} için toplam ${citySuccess}/${cityTotal} namaz vakti kaydedildi.`);
                
                if (citySuccess > 0) {
                    totalSuccess++;
                } else {
                    totalFailed++;
                }
                
                // Her ilçe arasında biraz bekle
                await sleep(5000);
            } catch (cityError) {
                console.error(`${city.city_name} için hata: ${cityError.message}`);
                totalFailed++;
                
                // Hatadan sonra işleme devam et
                await client.query('ROLLBACK');
                await client.query('BEGIN');
            }
            
            // Her 10 ilçeden sonra sonuçları göster
            if (processedCities % 10 === 0 || processedCities === cities.length) {
                console.log(`\n--- İLERLEME RAPORU (${processedCities}/${cities.length}) ---`);
                console.log(`Başarılı ilçeler: ${totalSuccess}`);
                console.log(`Başarısız ilçeler: ${totalFailed}`);
                console.log(`Toplam eklenen namaz vakti: ${totalPrayerTimesAdded}`);
                console.log('---------------------------\n');
            }
        }
        
        // Son commit
        await client.query('COMMIT');
        
        console.log('\n--- ÖZET ---');
        console.log(`Toplam işlenen ilçe: ${cities.length}`);
        console.log(`Başarılı ilçeler: ${totalSuccess}`);
        console.log(`Başarısız ilçeler: ${totalFailed}`);
        console.log(`Toplam eklenen namaz vakti: ${totalPrayerTimesAdded}`);
        console.log('-------------');
        
    } catch (error) {
        console.error('İşlem sırasında hata oluştu:', error);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        console.log('Veritabanı bağlantısı kapatıldı.');
    }
}

// Çalıştır
if (require.main === module) {
    console.log('Namaz vakitleri çekme işlemi başlatılıyor...');
    fetchAndSavePrayerTimes()
        .then(() => {
            console.log('İşlem tamamlandı.');
            process.exit(0);
        })
        .catch(err => {
            console.error('İşlem başarısız oldu:', err);
            process.exit(1);
        });
} else {
    module.exports = { fetchAndSavePrayerTimes };
} 