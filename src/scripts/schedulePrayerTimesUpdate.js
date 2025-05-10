const { fetchAndSavePrayerTimes } = require('./fetchPrayerTimes');
const db = require('../config/db');

// Veritabanında tarih-konum bazında eksikleri kontrol eden fonksiyon
async function checkMissingPrayerTimes() {
  try {
    console.log('Eksik namaz vakitleri kontrol ediliyor...');
    
    // API tarih aralığını al
    const dates = await db.query(`
      SELECT 
        MIN(date) as min_date, 
        MAX(date) as max_date
      FROM 
        prayer_times
    `);
    
    // Eğer hiç veri yoksa, eksik veri kontrolü gerekmiyor
    if (!dates.rows[0].min_date || !dates.rows[0].max_date) {
      console.log('Veritabanında hiç veri bulunamadı. Tam veri çekme işlemi başlatılacak.');
      return true;
    }
    
    // Tarih aralığında her konum için beklenen veri sayısı
    const startDate = new Date(dates.rows[0].min_date);
    const endDate = new Date(dates.rows[0].max_date);
    const dayDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`Tarih aralığı: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    console.log(`Toplam gün sayısı: ${dayDiff}`);
    
    // Konum bazında kontrol
    const cities = await db.query('SELECT COUNT(*) as count FROM cities');
    const cityCount = parseInt(cities.rows[0].count);
    
    // Mevcut namaz vakitleri sayısı
    const prayerTimes = await db.query('SELECT COUNT(*) as count FROM prayer_times');
    const prayerCount = parseInt(prayerTimes.rows[0].count);
    
    // Teorik olarak olması gereken veri miktarı
    const expectedCount = cityCount * dayDiff;
    const missingRatio = 1 - (prayerCount / expectedCount);
    
    console.log(`Konum sayısı: ${cityCount}`);
    console.log(`Mevcut namaz vakitleri: ${prayerCount}`);
    console.log(`Beklenen veri miktarı: ${expectedCount}`);
    console.log(`Eksik veri oranı: %${(missingRatio * 100).toFixed(2)}`);
    
    // %10'dan fazla eksik veri varsa güncelleme yap
    return missingRatio > 0.1;
  } catch (error) {
    console.error('Eksik veri kontrolü sırasında hata:', error);
    return true; // Hata durumunda güvenli tarafta kalmak için güncelleme yap
  }
}

// Günlük güncelleme
async function dailyUpdate() {
  try {
    console.log('Günlük güncelleme başlatılıyor...');
    
    // Eksik veri durumunu kontrol et
    const needsFullUpdate = await checkMissingPrayerTimes();
    
    if (needsFullUpdate) {
      console.log('Yüksek oranda eksik veri tespit edildi. Tam veri çekme işlemi başlatılıyor...');
      await fetchAndSavePrayerTimes();
    } else {
      console.log('Veri tabanı güncel. Tam güncelleme gerekmedi.');
    }
    
    console.log('Günlük güncelleme tamamlandı.');
  } catch (error) {
    console.error('Günlük güncelleme sırasında hata:', error);
  }
}

// Aylık tam güncelleme
async function monthlyFullUpdate() {
  try {
    console.log('Aylık tam güncelleme başlatılıyor...');
    
    // Eksik veri kontrolü olmadan doğrudan tam güncelleme yap
    await fetchAndSavePrayerTimes();
    
    console.log('Aylık tam güncelleme tamamlandı.');
  } catch (error) {
    console.error('Aylık tam güncelleme sırasında hata:', error);
  }
}

// Çizelgeli çalıştırma
function scheduleUpdates() {
  console.log('Namaz vakitleri güncelleme çizelgesi başlatılıyor...');
  
  // Her gün sabah 03:00'de kontrol et
  const dailySchedule = () => {
    const now = new Date();
    console.log(`${now.toISOString()} - Günlük kontrol başlatılıyor...`);
    dailyUpdate();
  };
  
  // Her ayın 1'inde tam güncelleme yap
  const monthlySchedule = () => {
    const now = new Date();
    if (now.getDate() === 1) {
      console.log(`${now.toISOString()} - Aylık tam güncelleme başlatılıyor...`);
      monthlyFullUpdate();
    }
  };
  
  // İlk çalıştırma
  dailyUpdate();
  
  // Çizelge oluştur: Her gün 03:00
  const dailyInterval = 24 * 60 * 60 * 1000; // 24 saat
  setInterval(dailySchedule, dailyInterval);
  
  // Aylık kontrol için her gün kontrol et
  setInterval(monthlySchedule, dailyInterval);
  
  console.log('Güncelleme çizelgesi başlatıldı.');
}

// Scripti çalıştır
if (require.main === module) {
  scheduleUpdates();
} else {
  module.exports = { scheduleUpdates, dailyUpdate, monthlyFullUpdate };
} 