/**
 * Eksik konum ve namaz vakitlerini kontrol eden ve tamamlayan script
 */
const db = require('../config/db');
const diyanetApi = require('../utils/diyanetApi');
const { sleep, getCurrentYear, getNextYear } = require('../utils/helpers');

// Komut satırı parametrelerini işle
function parseCommandLineArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

// Komut satırı parametrelerini al
const args = parseCommandLineArgs();
// Maksimum indirme sayısı (varsayılan: 50)
const maxDownloads = parseInt(args.limit) || 50;

console.log(`Başlangıç parametreleri: Maksimum indirme sayısı = ${maxDownloads}`);

// Tüm ülkeler için şehir ve ilçe verilerini kontrol eder
async function checkAndFixLocations() {
  console.log('Eksik konum verileri kontrol ediliyor...');
  
  try {
    // Tüm ülkeleri getir
    const countries = await db.query('SELECT * FROM countries ORDER BY id');
    console.log(`${countries.rows.length} ülke bulundu.`);
    
    // Her ülke için şehirleri kontrol et
    for (const country of countries.rows) {
      console.log(`${country.name} (${country.id}) kontrol ediliyor...`);
      
      // Bu ülkeye ait şehirleri say
      const statesCount = await db.query('SELECT COUNT(*) FROM states WHERE country_id = $1', [country.id]);
      
      if (parseInt(statesCount.rows[0].count) === 0) {
        console.log(`${country.name} için şehir verisi eksik, indiriliyor...`);
        try {
          // Diyanet API'den şehirleri çek
          const statesResponse = await diyanetApi.getStates(country.id);
          
          if (statesResponse.success && statesResponse.data && Array.isArray(statesResponse.data)) {
            // Şehirleri veritabanına kaydet
            const statePromises = statesResponse.data.map(async state => {
              try {
                await db.query(
                  'INSERT INTO states (id, country_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $3',
                  [state.id, country.id, state.name]
                );
              } catch (err) {
                console.error(`Şehir kaydedilemedi: ${state.name}`, err.message);
              }
            });
            
            await Promise.all(statePromises);
            console.log(`${statesResponse.data.length} şehir ${country.name} için kaydedildi.`);
          } else {
            console.log(`${country.name} için şehir verisi alınamadı.`);
          }
          
          // API sınırlamasını aşmamak için bekle
          await sleep(1000);
        } catch (err) {
          console.error(`Şehir verisi getirilirken hata: ${country.name}`, err.message);
        }
      } else {
        console.log(`${country.name} için ${statesCount.rows[0].count} şehir mevcut.`);
      }
    }
    
    // Şehirler için ilçeleri kontrol et
    const states = await db.query('SELECT * FROM states ORDER BY id');
    console.log(`${states.rows.length} şehir bulundu, ilçeler kontrol ediliyor...`);
    
    for (const state of states.rows) {
      // Bu şehre ait ilçeleri say
      const citiesCount = await db.query('SELECT COUNT(*) FROM cities WHERE state_id = $1', [state.id]);
      
      if (parseInt(citiesCount.rows[0].count) === 0) {
        console.log(`${state.name} (${state.id}) için ilçe verisi eksik, indiriliyor...`);
        
        try {
          // Diyanet API'den ilçeleri çek
          const citiesResponse = await diyanetApi.getCities(state.id);
          
          if (citiesResponse.success && citiesResponse.data && Array.isArray(citiesResponse.data)) {
            // İlçeleri veritabanına kaydet
            const cityPromises = citiesResponse.data.map(async city => {
              try {
                await db.query(
                  'INSERT INTO cities (id, state_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $3',
                  [city.id, state.id, city.name]
                );
              } catch (err) {
                console.error(`İlçe kaydedilemedi: ${city.name}`, err.message);
              }
            });
            
            await Promise.all(cityPromises);
            console.log(`${citiesResponse.data.length} ilçe ${state.name} için kaydedildi.`);
          } else {
            console.log(`${state.name} için ilçe verisi alınamadı.`);
          }
          
          // API sınırlamasını aşmamak için bekle
          await sleep(1000);
        } catch (err) {
          console.error(`İlçe verisi getirilirken hata: ${state.name}`, err.message);
        }
      } else {
        console.log(`${state.name} için ${citiesCount.rows[0].count} ilçe mevcut.`);
      }
    }
    
    console.log('Konum verilerinin kontrolü tamamlandı.');
    return true;
  } catch (err) {
    console.error('Konum verilerini kontrol ederken hata:', err);
    return false;
  }
}

// Her şehir için eksik namaz vakitlerini kontrol eder ve indirir
async function checkAndFixPrayerTimes() {
  console.log('Eksik namaz vakitleri kontrol ediliyor...');
  
  try {
    // API'den desteklenen tarih aralığını al
    const dateRangeResponse = await diyanetApi.getPrayerTimeDateRange();
    
    if (!dateRangeResponse || !dateRangeResponse.success || !dateRangeResponse.data) {
      console.log('Tarih aralığı alınamadı!');
      return false;
    }
    
    const { startDate, endDate } = dateRangeResponse.data;
    console.log(`API desteklenen tarih aralığı: ${startDate} - ${endDate}`);
    
    // Mevcut yıl ve sonraki yıl
    const currentYear = getCurrentYear();
    const nextYear = getNextYear();
    
    // Şehirleri al ve her biri için namaz vakitlerini kontrol et
    const cities = await db.query('SELECT * FROM cities ORDER BY id');
    console.log(`${cities.rows.length} ilçe için namaz vakitleri kontrol edilecek...`);
    
    // İndirme limitleri için sayaç
    let downloadCounter = 0;
    
    console.log(`İndirme limiti: Maksimum ${maxDownloads} ilçe için veri indirilecek.`);
    
    for (const city of cities.rows) {
      if (downloadCounter >= maxDownloads) {
        console.log(`Maksimum indirme sayısına (${maxDownloads}) ulaşıldı. Kalan işlemler sonraki çalışmada tamamlanacak.`);
        break;
      }
      
      // Bu şehir için mevcut yılın namaz vakitlerini kontrol et
      const currentYearCount = await db.query(
        "SELECT COUNT(*) FROM prayer_times WHERE city_id = $1 AND date_time >= $2 AND date_time < $3",
        [city.id, `${currentYear}-01-01`, `${currentYear + 1}-01-01`]
      );
      
      // Bir yılda beklenen veri sayısı: günde 6 vakit * 365 (veya 366) gün
      const daysInCurrentYear = new Date(currentYear, 1, 29).getDate() === 29 ? 366 : 365;
      const expectedTimesCurrentYear = daysInCurrentYear * 6;
      
      // Mevcut yıl için eksik veri var mı?
      if (parseInt(currentYearCount.rows[0].count) < expectedTimesCurrentYear) {
        console.log(`${city.name} (${city.id}) için ${currentYear} yılı namaz vakitleri eksik. İndiriliyor...`);
        
        try {
          // Diyanet API'den namaz vakitlerini çek
          const prayerTimesResponse = await diyanetApi.getPrayerTimes(city.id, `${currentYear}-01-01`, `${currentYear}-12-31`);
          
          if (prayerTimesResponse.success && prayerTimesResponse.data && Array.isArray(prayerTimesResponse.data)) {
            // Namaz vakitlerini veritabanına kaydet
            let savedCount = 0;
            
            for (const prayerTime of prayerTimesResponse.data) {
              if (!prayerTime || !prayerTime.MiladiTarih) continue;
              
              try {
                // Her namaz vakti için veritabanına kayıt ekle
                await db.query(
                  'INSERT INTO prayer_times (city_id, date_time, fajr, sunrise, dhuhr, asr, maghrib, isha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (city_id, date_time) DO UPDATE SET fajr = $3, sunrise = $4, dhuhr = $5, asr = $6, maghrib = $7, isha = $8',
                  [
                    city.id,
                    prayerTime.MiladiTarih,
                    prayerTime.Imsak,
                    prayerTime.Gunes,
                    prayerTime.Ogle,
                    prayerTime.Ikindi,
                    prayerTime.Aksam,
                    prayerTime.Yatsi
                  ]
                );
                savedCount++;
              } catch (err) {
                console.error(`Namaz vakti kaydedilemedi: ${city.name} - ${prayerTime.MiladiTarih}`, err.message);
              }
            }
            
            console.log(`${city.name} için ${savedCount} namaz vakti kaydedildi.`);
            downloadCounter++;
          } else {
            console.log(`${city.name} için namaz vakitleri alınamadı.`);
          }
          
          // API sınırlamasını aşmamak için bekle
          await sleep(2000);
        } catch (err) {
          console.error(`Namaz vakitleri getirilirken hata: ${city.name}`, err.message);
        }
      } else {
        console.log(`${city.name} için ${currentYear} yılı namaz vakitleri tam.`);
      }
      
      // API desteklenen aralığa göre sonraki yıl için de kontrol et
      const apiEndDate = new Date(endDate);
      const nextYearStart = new Date(`${nextYear}-01-01`);
      
      // Sonraki yılın başlangıcı API tarafından destekleniyor mu?
      if (nextYearStart <= apiEndDate) {
        // Bu şehir için sonraki yılın namaz vakitlerini kontrol et
        const nextYearCount = await db.query(
          "SELECT COUNT(*) FROM prayer_times WHERE city_id = $1 AND date_time >= $2 AND date_time < $3",
          [city.id, `${nextYear}-01-01`, `${nextYear + 1}-01-01`]
        );
        
        // Bir yılda beklenen veri sayısı
        const daysInNextYear = new Date(nextYear, 1, 29).getDate() === 29 ? 366 : 365;
        const expectedTimesNextYear = daysInNextYear * 6;
        
        // Sonraki yıl için eksik veri var mı?
        if (parseInt(nextYearCount.rows[0].count) < expectedTimesNextYear) {
          if (downloadCounter >= maxDownloads) {
            console.log(`Maksimum indirme sayısına (${maxDownloads}) ulaşıldı. Kalan işlemler sonraki çalışmada tamamlanacak.`);
            break;
          }
          
          console.log(`${city.name} (${city.id}) için ${nextYear} yılı namaz vakitleri eksik. İndiriliyor...`);
          
          try {
            // Diyanet API'den namaz vakitlerini çek
            const prayerTimesResponse = await diyanetApi.getPrayerTimes(city.id, `${nextYear}-01-01`, `${nextYear}-12-31`);
            
            if (prayerTimesResponse.success && prayerTimesResponse.data && Array.isArray(prayerTimesResponse.data)) {
              // Namaz vakitlerini veritabanına kaydet
              let savedCount = 0;
              
              for (const prayerTime of prayerTimesResponse.data) {
                if (!prayerTime || !prayerTime.MiladiTarih) continue;
                
                try {
                  // Her namaz vakti için veritabanına kayıt ekle
                  await db.query(
                    'INSERT INTO prayer_times (city_id, date_time, fajr, sunrise, dhuhr, asr, maghrib, isha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (city_id, date_time) DO UPDATE SET fajr = $3, sunrise = $4, dhuhr = $5, asr = $6, maghrib = $7, isha = $8',
                    [
                      city.id,
                      prayerTime.MiladiTarih,
                      prayerTime.Imsak,
                      prayerTime.Gunes,
                      prayerTime.Ogle,
                      prayerTime.Ikindi,
                      prayerTime.Aksam,
                      prayerTime.Yatsi
                    ]
                  );
                  savedCount++;
                } catch (err) {
                  console.error(`Namaz vakti kaydedilemedi: ${city.name} - ${prayerTime.MiladiTarih}`, err.message);
                }
              }
              
              console.log(`${city.name} için ${nextYear} yılı ${savedCount} namaz vakti kaydedildi.`);
              downloadCounter++;
            } else {
              console.log(`${city.name} için ${nextYear} yılı namaz vakitleri alınamadı.`);
            }
            
            // API sınırlamasını aşmamak için bekle
            await sleep(2000);
          } catch (err) {
            console.error(`Namaz vakitleri getirilirken hata: ${city.name} - ${nextYear}`, err.message);
          }
        } else {
          console.log(`${city.name} için ${nextYear} yılı namaz vakitleri tam.`);
        }
      }
    }
    
    console.log('Namaz vakitlerinin kontrolü tamamlandı.');
    return true;
  } catch (err) {
    console.error('Namaz vakitlerini kontrol ederken hata:', err);
    return false;
  }
}

// Ana fonksiyon
async function main() {
  try {
    console.log('Eksik veri kontrolü başlatılıyor...');
    
    // Önce konum verilerini kontrol edip tamamla
    await checkAndFixLocations();
    
    // Sonra namaz vakitlerini kontrol edip tamamla
    await checkAndFixPrayerTimes();
    
    console.log('Tüm eksik veri kontrolleri tamamlandı.');
  } catch (err) {
    console.error('Eksik veri kontrolünde hata:', err);
  } finally {
    // Veritabanı bağlantısını kapat
    db.pool.end();
  }
}

// Scripti çalıştır
main(); 