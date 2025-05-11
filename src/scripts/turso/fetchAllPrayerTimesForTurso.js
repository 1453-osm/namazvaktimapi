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

// Tarih formatını düzenleyen yardımcı fonksiyon - Çeşitli formatları YYYY-MM-DD'ye çevirir
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  
  // YYYY-MM-DD formatını kontrol et (zaten doğru format)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // DD.MM.YYYY formatını kontrol et
  if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const parts = dateStr.split('.');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  // Tarih nesnesi formatını kontrol et
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
    }
  } catch (e) {
    // Dönüşüm başarısız oldu, orijinal değeri döndür
  }
  
  return dateStr; // Hiçbir format uymuyorsa orijinal değeri döndür
};

// Belirli bir süre bekleyen fonksiyon 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Namaz vakitlerini veritabanına kaydetme fonksiyonu
const createPrayerTimesInBulk = async (cityId, prayerTimesArray) => {
  if (!prayerTimesArray || !prayerTimesArray.length) {
    console.log(`Veri bulunamadı, cityId: ${cityId}`);
    return [];
  }
  
  console.log(`Toplam ${prayerTimesArray.length} adet namaz vakti verisi kaydedilecek, ilçe ID: ${cityId}`);
  const savedItems = [];
  
  for (const item of prayerTimesArray) {
    try {
      // Tarih formatı kontrolü - API yanıt formatı değişmiş olabilir
      let prayerDate = item.MiladiTarih || null;
      
      // gregorianDateShort veya diğer tarih alanlarını dene
      if (!prayerDate && item.gregorianDateShort) {
        prayerDate = formatDate(item.gregorianDateShort);
      }
      
      // gregorianDateLongIso8601 veya diğer ISO tarih alanlarını dene
      if (!prayerDate && item.gregorianDateLongIso8601) {
        prayerDate = formatDate(item.gregorianDateLongIso8601);
      }
      
      if (!prayerDate) {
        console.error(`Kayıt hatası (ilçe ID: ${cityId}): Tarih bilgisi eksik veya geçersiz.`);
        continue;
      }

      // API yanıt formatında farklı alan isimleri kullanılabilir, bunları kontrol edelim
      const fajr = item.Imsak || item.fajr || null;
      const sunrise = item.Gunes || item.sunrise || null;
      const dhuhr = item.Ogle || item.dhuhr || null;
      const asr = item.Ikindi || item.asr || null;
      const maghrib = item.Aksam || item.maghrib || null;
      const isha = item.Yatsi || item.isha || null;
      const qibla = item.Kible || item.qiblaTime || null;
      const gregorianDate = item.MiladiTarih || item.gregorianDateShort || prayerDate; 
      const hijriDate = item.HicriTarih || item.hijriDateShort || null;
      
      const query = `
        INSERT OR REPLACE INTO prayer_times 
        (city_id, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha, qibla, gregorian_date, hijri_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      const args = [
        cityId,
        prayerDate,
        fajr,
        sunrise,
        dhuhr,
        asr,
        maghrib,
        isha,
        qibla,
        gregorianDate,
        hijriDate
      ];
      
      await client.execute({
        sql: query,
        args: args
      });
      
      savedItems.push(item);
    } catch (error) {
      console.error(`Kayıt hatası (ilçe ID: ${cityId}, tarih: ${item?.MiladiTarih || item?.gregorianDateShort || 'undefined'}):`, error.message);
    }
  }
  
  console.log(`Kayıt işlemi tamamlandı. ${savedItems.length}/${prayerTimesArray.length} veri kaydedildi`);
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
      
      console.log(`API Sonucu: Başarılı=${result ? 'Evet' : 'Hayır'}, Data=${result?.data ? `${result.data.length} adet` : 'Yok'}`);
      
      if (result && result.data && result.data.length > 0) {
        // Yeni API yanıt formatını kontrol et
        const firstItem = result.data[0];
        if (firstItem) {
          const fields = Object.keys(firstItem).join(', ');
          console.log(`API veri yapısı: ${fields.substring(0, 100)}...`);
        }
        
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
    const startDate = `${year}-01-01`; // 1 Ocak
    const endDate = `${year}-12-31`; // 31 Aralık
    
    let totalDays = 0;
    let result;
    
    try {
      // Tekrar deneme mekanizması ile yıllık veriyi tek seferde çek
      result = await retryFetch(city, startDate, endDate);
      
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