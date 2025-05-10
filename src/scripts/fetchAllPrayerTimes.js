// Tüm dünya ilçelerinin namaz vakitlerini yıllık olarak çeken ve kaydeden script
const diyanetService = require('../services/diyanetService');
const prayerTimeModel = require('../models/prayerTimeModel');
const locationModel = require('../models/locationModel');
const db = require('../config/db');

// Tarih formatını düzenleyen yardımcı fonksiyon
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
};

// Belirli bir süre bekleyen fonksiyon 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        const savedData = await prayerTimeModel.createPrayerTimesInBulk(city.id, result.data);
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

// Ana fonksiyon - Tüm dünya için namaz vakitlerini çek
const fetchAllPrayerTimes = async () => {
  try {
    console.log('Veritabanı bağlantısı test ediliyor...');
    await db.testConnection();
    
    // Çalışma parametreleri
    const currentYear = new Date().getFullYear();
    
    console.log(`\n=== ${currentYear} YILI İÇİN TÜM DÜNYA NAMAZ VAKİTLERİ GÜNCELLEME İŞLEMİ ===\n`);
    
    // Önce Türkiye'deki önemli şehirleri işle (örnek olarak İstanbul, Ankara, İzmir)
    console.log('\n--- ÖNCELİKLİ TÜRKİYE ŞEHİRLERİ ---');
    const priorityCities = await db.query(`
      SELECT c.*, s.name as state_name, co.name as country_name 
      FROM cities c
      JOIN states s ON c.state_id = s.id
      JOIN countries co ON s.country_id = co.id
      WHERE co.id = 2 AND (s.id = 539 OR s.id = 522 OR s.id = 547) -- İstanbul, Ankara, İzmir
      ORDER BY s.name ASC
    `);
    
    if (priorityCities.rows.length > 0) {
      for (const city of priorityCities.rows) {
        try {
          await fetchAndSavePrayerTimesForCity(city, currentYear);
        } catch (error) {
          console.error(`${city.name} için işlem başarısız:`, error.message);
          // Hata olsa bile diğer şehirlerle devam et
          continue;
        }
      }
    }
    
    // Sonra diğer Türkiye şehirlerini işle
    console.log('\n--- DİĞER TÜRKİYE ŞEHİRLERİ ---');
    const turkishCities = await db.query(`
      SELECT c.*, s.name as state_name, co.name as country_name 
      FROM cities c
      JOIN states s ON c.state_id = s.id
      JOIN countries co ON s.country_id = co.id
      WHERE co.id = 2 AND s.id NOT IN (539, 522, 547) -- İstanbul, Ankara, İzmir değil
      ORDER BY s.name ASC
    `);
    
    if (turkishCities.rows.length > 0) {
      for (const city of turkishCities.rows) {
        try {
          await fetchAndSavePrayerTimesForCity(city, currentYear);
        } catch (error) {
          console.error(`${city.name} için işlem başarısız:`, error.message);
          // Hata olsa bile diğer şehirlerle devam et
          continue;
        }
      }
    }
    
    // Son olarak diğer dünya ülkelerini işle
    console.log('\n--- DİĞER DÜNYA ÜLKELERİ ---');
    const worldCities = await db.query(`
      SELECT c.*, s.name as state_name, co.name as country_name 
      FROM cities c
      JOIN states s ON c.state_id = s.id
      JOIN countries co ON s.country_id = co.id
      WHERE co.id != 2 -- Türkiye değil
      ORDER BY co.name ASC, s.name ASC
      LIMIT 5000 -- En fazla 5000 ilçe için işlem yap (API limitleri nedeniyle)
    `);
    
    if (worldCities.rows.length > 0) {
      for (const city of worldCities.rows) {
        try {
          await fetchAndSavePrayerTimesForCity(city, currentYear);
        } catch (error) {
          console.error(`${city.name} için işlem başarısız:`, error.message);
          // Hata olsa bile diğer şehirlerle devam et
          continue;
        }
      }
    }
    
    console.log('\n=== TÜM DÜNYA NAMAZ VAKİTLERİ GÜNCELLEME İŞLEMİ TAMAMLANDI ===\n');
  } catch (error) {
    console.error('Toplu veri çekme işlemi sırasında hata oluştu:', error);
  } finally {
    // Bağlantıyı kapat
    await db.pool.end();
  }
};

// Uygulamayı çalıştır
console.log('Namaz vakitleri güncelleme işlemi başlatılıyor...');
fetchAllPrayerTimes().then(() => {
  console.log('İşlem tamamlandı.');
}).catch(err => {
  console.error('İşlem hatası:', err);
  process.exit(1);
}); 