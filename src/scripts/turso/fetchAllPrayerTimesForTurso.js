// Tüm dünya ilçelerinin namaz vakitlerini yıllık olarak çeken ve Turso veritabanına kaydeden script
const diyanetService = require('../../services/diyanetService');
const { client } = require('../../config/turso');

// Komut satırı argümanlarını işle
const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    chunk: 1,
    totalChunks: 1
  };

  args.forEach(arg => {
    if (arg.startsWith('--chunk=')) {
      result.chunk = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--total-chunks=')) {
      result.totalChunks = parseInt(arg.split('=')[1], 10);
    }
  });

  return result;
};

// Çalışma parametreleri
const params = parseArgs();
console.log(`Paralel çalışma parametreleri: Parça ${params.chunk}/${params.totalChunks}`);

// Tarih formatını düzenleyen yardımcı fonksiyon
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
};

// Belirli bir süre bekleyen fonksiyon 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Namaz vakitlerini veritabanına kaydetme fonksiyonu
const createPrayerTimesInBulk = async (cityId, prayerTimesArray) => {
  if (!prayerTimesArray || !prayerTimesArray.length) {
    return [];
  }
  
  const savedItems = [];
  
  for (const item of prayerTimesArray) {
    try {
      const query = `
        INSERT OR REPLACE INTO prayer_times 
        (city_id, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha, qibla, gregorian_date, hijri_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      await client.execute({
        sql: query,
        args: [
          cityId,
          item.MiladiTarih,
          item.Imsak,
          item.Gunes,
          item.Ogle,
          item.Ikindi,
          item.Aksam,
          item.Yatsi,
          item.Kible || null,
          item.MiladiTarih || null,
          item.HicriTarih || null
        ]
      });
      
      savedItems.push(item);
    } catch (error) {
      console.error(`Kayıt hatası (ilçe ID: ${cityId}, tarih: ${item.MiladiTarih}):`, error.message);
    }
  }
  
  return savedItems;
};

// API isteği için tekrar deneme mekanizması
const retryFetch = async (city, startDate, endDate, maxRetries = 3, retryDelay = 5000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${city.name}] ${startDate} - ${endDate} aralığındaki veri çekiliyor... (Deneme: ${attempt}/${maxRetries})`);
      
      // Diyanet API'den namaz vakitlerini al
      const result = await diyanetService.getPrayerTimesByDateRange(
        city.id,
        startDate,
        endDate
      );
      
      if (result && result.data && result.data.length > 0) {
        return result;
      } else {
        console.warn(`[${city.name}] ${startDate} - ${endDate} aralığında veri bulunamadı.`);
        lastError = new Error('Veri bulunamadı');
      }
    } catch (error) {
      console.error(`[${city.name}] ${startDate} - ${endDate} aralığı için hata (Deneme: ${attempt}/${maxRetries}):`, error.message);
      lastError = error;
      
      // Token yenileme hatası gibi kimlik doğrulama sorunlarında daha uzun bekle
      if (error.message.includes('401') || error.message.includes('auth') || error.message.includes('token')) {
        await sleep(retryDelay * 3);
      } else {
        await sleep(retryDelay);
      }
      
      continue; // Sonraki denemeye geç
    }
  }
  
  // Tüm denemeler başarısız oldu
  throw lastError || new Error('Maksimum deneme sayısına ulaşıldı');
};

// İlçe için namaz vakitlerini tüm yıl için çek ve kaydet
const fetchAndSavePrayerTimesForCity = async (city, year) => {
  try {
    console.log(`\n[${city.name} (${city.id})] için ${year} yılı namaz vakitlerini çekme işlemi başlıyor...`);
    
    // Yılın başlangıç ve bitiş tarihlerini belirle
    const startDate = new Date(year, 0, 1); // 1 Ocak
    const endDate = new Date(year, 11, 31); // 31 Aralık
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    let totalDays = 0;
    let result;
    
    try {
      // Tekrar deneme mekanizması ile yıllık veriyi tek seferde çek
      result = await retryFetch(city, startDateStr, endDateStr);
      
      if (result && result.data && result.data.length > 0) {
        // API'den gelen verileri veritabanına kaydet
        const savedData = await createPrayerTimesInBulk(city.id, result.data);
        console.log(`[${city.name}] ${savedData.length} günlük namaz vakti verisi veritabanına kaydedildi.`);
        totalDays = savedData.length;
      }
    } catch (error) {
      console.error(`[${city.name}] yıllık veri çekme işlemi başarısız oldu:`, error.message);
      throw error;
    }
    
    console.log(`\n[${city.name}] için işlem tamamlandı. Toplam ${totalDays} günlük veri kaydedildi.`);
    
    // İstekler arasında kısa bir bekletme yap (3 saniye)
    await sleep(3000);
    
    return totalDays;
  } catch (error) {
    console.error(`[${city.name}] için işlem hatası:`, error.message);
    throw error;
  }
};

// Şehirleri parçalara ayırma fonksiyonu
const splitArrayIntoChunks = (array, chunkNumber, totalChunks) => {
  const totalItems = array.length;
  const chunkSize = Math.ceil(totalItems / totalChunks);
  const startIndex = (chunkNumber - 1) * chunkSize;
  let endIndex = startIndex + chunkSize;
  
  // Son parçada dizinin dışına çıkmayı önle
  if (endIndex > totalItems) {
    endIndex = totalItems;
  }
  
  return array.slice(startIndex, endIndex);
};

// Ana fonksiyon - Tüm dünya için namaz vakitlerini çek
const fetchAllPrayerTimes = async () => {
  try {
    console.log('Turso veritabanı bağlantısı test ediliyor...');
    const { testConnection } = require('../../config/turso');
    await testConnection();
    
    // Çalışma parametreleri
    const currentYear = new Date().getFullYear();
    
    console.log(`\n=== ${currentYear} YILI İÇİN TÜM DÜNYA NAMAZ VAKİTLERİ GÜNCELLEME İŞLEMİ ===\n`);
    console.log(`Çalışma modu: Parça ${params.chunk}/${params.totalChunks}`);
    
    // Hangi şehirleri bu paralel iş işleyecek
    let citiesToProcess = [];
    
    // Önce Türkiye'deki önemli şehirleri işle (örnek olarak İstanbul, Ankara, İzmir)
    if (params.chunk === 1) {
      console.log('\n--- ÖNCELİKLİ TÜRKİYE ŞEHİRLERİ ---');
      const priorityCitiesResult = await client.execute(`
        SELECT c.id, c.name, c.state_id, s.name as state_name, co.name as country_name 
        FROM cities c
        JOIN states s ON c.state_id = s.id
        JOIN countries co ON s.country_id = co.id
        WHERE co.id = 2 AND (s.id = 539 OR s.id = 522 OR s.id = 547) -- İstanbul, Ankara, İzmir
        ORDER BY s.name ASC
      `);
      
      if (priorityCitiesResult.rows.length > 0) {
        for (const city of priorityCitiesResult.rows) {
          try {
            await fetchAndSavePrayerTimesForCity(city, currentYear);
          } catch (error) {
            console.error(`${city.name} için işlem başarısız:`, error.message);
            // Hata olsa bile diğer şehirlerle devam et
            continue;
          }
        }
      }
    }
    
    // Sonra diğer Türkiye şehirlerini işle - Parça 1-3 için
    if (params.chunk <= 3) {
      console.log('\n--- DİĞER TÜRKİYE ŞEHİRLERİ ---');
      const turkishCitiesResult = await client.execute(`
        SELECT c.id, c.name, c.state_id, s.name as state_name, co.name as country_name 
        FROM cities c
        JOIN states s ON c.state_id = s.id
        JOIN countries co ON s.country_id = co.id
        WHERE co.id = 2 AND s.id NOT IN (539, 522, 547) -- İstanbul, Ankara, İzmir değil
        ORDER BY s.name ASC
      `);
      
      if (turkishCitiesResult.rows.length > 0) {
        // Parçalara böl (ilk 3 parça için)
        const startChunk = Math.min(params.chunk, 3);
        const citiesChunk = splitArrayIntoChunks(turkishCitiesResult.rows, startChunk, 3);
        
        for (const city of citiesChunk) {
          try {
            await fetchAndSavePrayerTimesForCity(city, currentYear);
          } catch (error) {
            console.error(`${city.name} için işlem başarısız:`, error.message);
            // Hata olsa bile diğer şehirlerle devam et
            continue;
          }
        }
      }
    }
    
    // Son olarak diğer dünya ülkelerini işle - Parça 4-10 için
    if (params.chunk >= 4) {
      console.log('\n--- DİĞER DÜNYA ÜLKELERİ ---');
      const worldCitiesResult = await client.execute(`
        SELECT c.id, c.name, c.state_id, s.name as state_name, co.name as country_name 
        FROM cities c
        JOIN states s ON c.state_id = s.id
        JOIN countries co ON s.country_id = co.id
        WHERE co.id != 2 -- Türkiye değil
        ORDER BY co.name ASC, s.name ASC
        LIMIT 10000 -- En fazla 10000 ilçe için işlem yap (API limitleri nedeniyle)
      `);
      
      if (worldCitiesResult.rows.length > 0) {
        // Parçalara böl (kalan 7 parça için)
        const chunkIndex = params.chunk - 3; // 4. parça için 1, 5. parça için 2, ...
        const citiesChunk = splitArrayIntoChunks(worldCitiesResult.rows, chunkIndex, 7);
        
        console.log(`Parça ${params.chunk}: ${citiesChunk.length} şehir işlenecek`);
        
        for (const city of citiesChunk) {
          try {
            await fetchAndSavePrayerTimesForCity(city, currentYear);
          } catch (error) {
            console.error(`${city.name} için işlem başarısız:`, error.message);
            // Hata olsa bile diğer şehirlerle devam et
            continue;
          }
        }
      }
    }
    
    console.log(`\n=== PARÇA ${params.chunk}/${params.totalChunks} İÇİN NAMAZ VAKİTLERİ GÜNCELLEME İŞLEMİ TAMAMLANDI ===\n`);
  } catch (error) {
    console.error('Toplu veri çekme işlemi sırasında hata oluştu:', error);
  }
};

// Uygulamayı çalıştır
console.log(`Namaz vakitleri güncelleme işlemi başlatılıyor... (Parça ${params.chunk}/${params.totalChunks})`);
fetchAllPrayerTimes().then(() => {
  console.log(`Parça ${params.chunk}/${params.totalChunks} işlemi tamamlandı.`);
}).catch(err => {
  console.error('İşlem hatası:', err);
}); 