/**
 * Eksik konum ve namaz vakitlerini kontrol eden ve Turso veritabanına kaydeden script
 */
const { client } = require('../../config/turso');
const diyanetService = require('../../services/diyanetService');

// Yardımcı fonksiyonlar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getCurrentYear = () => new Date().getFullYear();
const getNextYear = () => new Date().getFullYear() + 1;

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
    const countriesResult = await client.execute('SELECT * FROM countries ORDER BY id');
    const countries = countriesResult.rows;
    console.log(`${countries.length} ülke bulundu.`);
    
    // Her ülke için şehirleri kontrol et
    for (const country of countries) {
      console.log(`${country.name} (${country.id}) kontrol ediliyor...`);
      
      // Bu ülkeye ait şehirleri say
      const statesCountResult = await client.execute('SELECT COUNT(*) as count FROM states WHERE country_id = ?', {
        args: [country.id]
      });
      
      if (parseInt(statesCountResult.rows[0].count) === 0) {
        console.log(`${country.name} için şehir verisi eksik, indiriliyor...`);
        try {
          // Diyanet API'den şehirleri çek
          const statesResponse = await diyanetService.getStates(country.id);
          
          if (statesResponse.success && statesResponse.data && Array.isArray(statesResponse.data)) {
            // Şehirleri veritabanına kaydet
            for (const state of statesResponse.data) {
              try {
                await client.execute({
                  sql: 'INSERT OR REPLACE INTO states (id, country_id, name, code, updated_at) VALUES (?, ?, ?, ?, datetime("now"))',
                  args: [state.id, country.id, state.name, state.code || '']
                });
              } catch (err) {
                console.error(`Şehir kaydedilemedi: ${state.name}`, err.message);
              }
            }
            
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
        console.log(`${country.name} için ${statesCountResult.rows[0].count} şehir mevcut.`);
      }
    }
    
    // Şehirler için ilçeleri kontrol et
    const statesResult = await client.execute('SELECT * FROM states ORDER BY id');
    const states = statesResult.rows;
    console.log(`${states.length} şehir bulundu, ilçeler kontrol ediliyor...`);
    
    for (const state of states) {
      // Bu şehre ait ilçeleri say
      const citiesCountResult = await client.execute('SELECT COUNT(*) as count FROM cities WHERE state_id = ?', {
        args: [state.id]
      });
      
      if (parseInt(citiesCountResult.rows[0].count) === 0) {
        console.log(`${state.name} (${state.id}) için ilçe verisi eksik, indiriliyor...`);
        
        try {
          // Diyanet API'den ilçeleri çek
          const citiesResponse = await diyanetService.getCities(state.id);
          
          if (citiesResponse.success && citiesResponse.data && Array.isArray(citiesResponse.data)) {
            // İlçeleri veritabanına kaydet
            for (const city of citiesResponse.data) {
              try {
                await client.execute({
                  sql: 'INSERT OR REPLACE INTO cities (id, state_id, name, code, updated_at) VALUES (?, ?, ?, ?, datetime("now"))',
                  args: [city.id, state.id, city.name, city.code || '']
                });
              } catch (err) {
                console.error(`İlçe kaydedilemedi: ${city.name}`, err.message);
              }
            }
            
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
        console.log(`${state.name} için ${citiesCountResult.rows[0].count} ilçe mevcut.`);
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
    const dateRangeResponse = await diyanetService.getPrayerTimeDateRange();
    
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
    const citiesResult = await client.execute('SELECT * FROM cities ORDER BY id');
    const cities = citiesResult.rows;
    console.log(`${cities.length} ilçe için namaz vakitleri kontrol edilecek...`);
    
    // İndirme limitleri için sayaç
    let downloadCounter = 0;
    
    console.log(`İndirme limiti: Maksimum ${maxDownloads} ilçe için veri indirilecek.`);
    
    for (const city of cities) {
      if (downloadCounter >= maxDownloads) {
        console.log(`Maksimum indirme sayısına (${maxDownloads}) ulaşıldı. Kalan işlemler sonraki çalışmada tamamlanacak.`);
        break;
      }
      
      // Bu şehir için mevcut yılın namaz vakitlerini kontrol et
      const currentYearCountResult = await client.execute(
        "SELECT COUNT(*) as count FROM prayer_times WHERE city_id = ? AND prayer_date >= ? AND prayer_date < ?", {
          args: [city.id, `${currentYear}-01-01`, `${currentYear + 1}-01-01`]
        }
      );
      
      // Bir yılda beklenen veri sayısı: 365 (veya 366) gün
      const daysInCurrentYear = new Date(currentYear, 1, 29).getDate() === 29 ? 366 : 365;
      
      // Mevcut yıl için eksik veri var mı?
      if (parseInt(currentYearCountResult.rows[0].count) < daysInCurrentYear) {
        console.log(`${city.name} (${city.id}) için ${currentYear} yılı namaz vakitleri eksik. İndiriliyor...`);
        
        try {
          // Diyanet API'den namaz vakitlerini çek
          const prayerTimesResponse = await diyanetService.getPrayerTimesByDateRange(
            city.id, 
            `${currentYear}-01-01`, 
            `${currentYear}-12-31`
          );
          
          if (prayerTimesResponse && prayerTimesResponse.data && Array.isArray(prayerTimesResponse.data)) {
            // Namaz vakitlerini veritabanına kaydet
            let savedCount = 0;
            
            for (const prayerTime of prayerTimesResponse.data) {
              if (!prayerTime || !prayerTime.MiladiTarih) continue;
              
              try {
                // Her namaz vakti için veritabanına kayıt ekle
                await client.execute({
                  sql: `
                    INSERT OR REPLACE INTO prayer_times 
                    (city_id, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha, qibla, gregorian_date, hijri_date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                  `,
                  args: [
                    city.id,
                    prayerTime.MiladiTarih,
                    prayerTime.Imsak || null,
                    prayerTime.Gunes || null,
                    prayerTime.Ogle || null,
                    prayerTime.Ikindi || null,
                    prayerTime.Aksam || null,
                    prayerTime.Yatsi || null,
                    prayerTime.Kible || null,
                    prayerTime.MiladiTarih || null,
                    prayerTime.HicriTarih || null
                  ]
                });
                savedCount++;
              } catch (err) {
                console.error(`Namaz vakti kaydedilemedi: ${city.name}, ${prayerTime?.MiladiTarih || 'undefined'}`, err.message);
              }
            }
            
            console.log(`${city.name} için ${savedCount} günlük namaz vakti kaydedildi.`);
            downloadCounter++;
          } else {
            console.log(`${city.name} için namaz vakti verisi alınamadı.`);
          }
          
          // API sınırlamasını aşmamak için bekle
          await sleep(2000);
        } catch (err) {
          console.error(`Namaz vakitleri çekilirken hata: ${city.name}`, err.message);
        }
      }
    }
    
    console.log('Namaz vakitleri kontrolü tamamlandı.');
    return true;
  } catch (err) {
    console.error('Namaz vakitlerini kontrol ederken hata:', err);
    return false;
  }
}

// Ana işlemi çalıştır
async function main() {
  try {
    // Bağlantıyı test et
    const { testConnection } = require('../../config/turso');
    await testConnection();
    
    console.log('=== Eksik Veri Kontrolü ve Düzeltme İşlemi Başlıyor ===');
    
    // Önce konum verilerini kontrol et
    await checkAndFixLocations();
    
    // Sonra namaz vakitlerini kontrol et
    await checkAndFixPrayerTimes();
    
    console.log('=== İşlem Tamamlandı ===');
  } catch (err) {
    console.error('İşlem sırasında hata oluştu:', err);
    process.exit(1);
  }
}

// Programı çalıştır
main()
  .then(() => console.log('Program başarıyla tamamlandı.'))
  .catch(err => {
    console.error('Program çalıştırılırken hata oluştu:', err);
    process.exit(1);
  }); 