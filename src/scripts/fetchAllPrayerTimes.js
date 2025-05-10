// Tüm dünya ilçelerinin namaz vakitlerini yıllık olarak çeken ve kaydeden script
const diyanetService = require('../services/diyanetService');
const prayerTimeModel = require('../models/prayerTimeModel');
const locationModel = require('../models/locationModel');
const db = require('../config/db');

// Ayları bölerek her ay için ayrı sorgu yapacağız (Diyanet API sınırlamalarından dolayı)
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
};

// İki tarih arasındaki ay sayısını hesapla
const getMonthsBetweenDates = (startDate, endDate) => {
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    endDate.getMonth() - startDate.getMonth() + 1
  );
};

// Tarih aralığını aylık parçalara böl
const getMonthlyDateRanges = (startDate, endDate) => {
  const ranges = [];
  const monthCount = getMonthsBetweenDates(startDate, endDate);
  
  let currentStart = new Date(startDate);
  
  for (let i = 0; i < monthCount; i++) {
    const currentEnd = new Date(currentStart);
    
    // Ayın son günü
    if (i < monthCount - 1) {
      // Bir sonraki ayın ilk günü - 1 gün
      currentEnd.setMonth(currentEnd.getMonth() + 1);
      currentEnd.setDate(0);
    } else {
      // Son ay için bitiş tarihi endDate
      currentEnd.setTime(endDate.getTime());
    }
    
    ranges.push({
      start: formatDate(currentStart),
      end: formatDate(currentEnd),
    });
    
    // Bir sonraki ayın ilk günü
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentEnd.getDate() + 1);
  }
  
  return ranges;
};

// İlçe için namaz vakitlerini tüm yıl için çek ve kaydet
const fetchAndSavePrayerTimesForCity = async (city, year) => {
  try {
    console.log(`\n[${city.name} (${city.id})] için ${year} yılı namaz vakitlerini çekme işlemi başlıyor...`);
    
    // Yılın başlangıç ve bitiş tarihlerini belirle
    const startDate = new Date(year, 0, 1); // 1 Ocak
    const endDate = new Date(year, 11, 31); // 31 Aralık
    
    // Tarihleri aylık aralıklara böl (API limitlerinden dolayı)
    const monthlyRanges = getMonthlyDateRanges(startDate, endDate);
    
    let totalDays = 0;
    
    // Her ay için ayrı ayrı çek
    for (let i = 0; i < monthlyRanges.length; i++) {
      const range = monthlyRanges[i];
      console.log(`[${city.name}] ${range.start} - ${range.end} aralığındaki veriler çekiliyor...`);
      
      try {
        // Diyanet API'den namaz vakitlerini al
        const result = await diyanetService.getPrayerTimesByDateRange(
          city.id,
          range.start,
          range.end
        );
        
        if (result && result.data && result.data.length > 0) {
          // API'den gelen verileri veritabanına kaydet
          const savedData = await prayerTimeModel.createPrayerTimesInBulk(city.id, result.data);
          console.log(`[${city.name}] ${savedData.length} günlük namaz vakti verisi veritabanına kaydedildi.`);
          totalDays += savedData.length;
          
          // API istek sınırlaması için bekleme süresi (dakikada 5 istek sınırı olabilir)
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 saniye bekle
        } else {
          console.warn(`[${city.name}] ${range.start} - ${range.end} aralığında veri bulunamadı.`);
        }
      } catch (error) {
        console.error(`[${city.name}] ${range.start} - ${range.end} aralığı için hata:`, error.message);
        // Hataya rağmen diğer aylarla devam et
        await new Promise(resolve => setTimeout(resolve, 30000)); // Hata durumunda 30 saniye bekle
      }
    }
    
    console.log(`\n[${city.name}] için işlem tamamlandı. Toplam ${totalDays} günlük veri kaydedildi.`);
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
        await fetchAndSavePrayerTimesForCity(city, currentYear);
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
        await fetchAndSavePrayerTimesForCity(city, currentYear);
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
        await fetchAndSavePrayerTimesForCity(city, currentYear);
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