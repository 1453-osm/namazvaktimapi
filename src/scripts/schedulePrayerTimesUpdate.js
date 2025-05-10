const { fetchAndSavePrayerTimes } = require('./fetchPrayerTimes');
const diyanetApi = require('../utils/diyanetApi');
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

// Diyanet API'den destek verilen tarih aralığını kontrol et
async function checkSupportedDateRange() {
  try {
    console.log('Diyanet API tarih aralığı kontrol ediliyor...');
    
    // API'den desteklenen tarih aralığını al
    const dateRangeResponse = await diyanetApi.getPrayerTimeDateRange();
    
    if (!dateRangeResponse || !dateRangeResponse.isSuccess || !dateRangeResponse.data) {
      console.error('Tarih aralığı alınamadı:', dateRangeResponse);
      return null;
    }
    
    const { startDate, endDate } = dateRangeResponse.data;
    console.log(`API desteklenen tarih aralığı: ${startDate} - ${endDate}`);
    
    return { startDate, endDate };
  } catch (error) {
    console.error('Tarih aralığı kontrolü sırasında hata:', error);
    return null;
  }
}

// Gelecek yıl verisinin API'de mevcut olup olmadığını kontrol et
async function checkNextYearData() {
  try {
    console.log('Gelecek yıl verisi kontrol ediliyor...');
    
    // API'den desteklenen tarih aralığını al
    const dateRange = await checkSupportedDateRange();
    
    if (!dateRange) {
      return false;
    }
    
    // Gelecek yılın 1 Ocak tarihi
    const now = new Date();
    const nextYear = now.getFullYear() + 1;
    const nextYearStart = `${nextYear}-01-01`;
    
    // Gelecek yılın son günü
    const nextYearEnd = `${nextYear}-12-31`;
    
    // API'nin desteklediği bitiş tarihi
    const apiEndDate = new Date(dateRange.endDate);
    
    // Gelecek yılın başlangıcı API tarafından destekleniyor mu?
    const nextYearStartSupported = new Date(nextYearStart) <= apiEndDate;
    
    // Gelecek yılın tamamı veya çoğunluğu destekleniyor mu?
    // En azından 6 ay desteklenmesini bekleyelim
    const sixMonthsNextYear = new Date(nextYear, 6, 1); // Temmuz 1
    const enoughNextYearSupported = sixMonthsNextYear <= apiEndDate;
    
    console.log(`Gelecek yıl (${nextYear}) verisi: ${nextYearStartSupported ? 'Mevcut' : 'Mevcut değil'}`);
    console.log(`Gelecek yılın en az yarısı: ${enoughNextYearSupported ? 'Destekleniyor' : 'Desteklenmiyor'}`);
    
    return enoughNextYearSupported;
  } catch (error) {
    console.error('Gelecek yıl verisi kontrolü sırasında hata:', error);
    return false;
  }
}

// Yıllık tam güncelleme
async function yearlyFullUpdate() {
  try {
    console.log('Yıllık tam güncelleme başlatılıyor...');
    
    // Gelecek yıl verisi kontrol et
    const hasNextYearData = await checkNextYearData();
    
    if (hasNextYearData) {
      console.log('Gelecek yıl verisi mevcut, tam güncelleme yapılıyor...');
      await fetchAndSavePrayerTimes();
      
      // İşlemi bu yıl için tamamlandı olarak işaretle
      const now = new Date();
      const year = now.getFullYear();
      await db.query(`
        INSERT INTO update_logs (update_type, update_year, status, updated_at)
        VALUES ('yearly', $1, 'completed', NOW())
        ON CONFLICT (update_type, update_year) 
        DO UPDATE SET status = 'completed', updated_at = NOW()
      `, [year]);
      
      console.log(`${year} yılı için yıllık güncelleme tamamlandı ve kayıt edildi.`);
      return true;
    } else {
      console.log('Gelecek yıl verisi henüz mevcut değil, güncelleme ertelendi.');
      return false;
    }
  } catch (error) {
    console.error('Yıllık tam güncelleme sırasında hata:', error);
    return false;
  }
}

// Acil durum güncelleme kontrolü
async function emergencyUpdate() {
  try {
    console.log('Acil durum güncelleme kontrolü yapılıyor...');
    
    // Son veritabanındaki en son tarihi al
    const latestDateResult = await db.query('SELECT MAX(date) as latest_date FROM prayer_times');
    const latestDate = latestDateResult.rows[0].latest_date;
    
    if (!latestDate) {
      console.log('Veritabanında hiç veri yok, tam güncelleme yapılacak.');
      await fetchAndSavePrayerTimes();
      return true;
    }
    
    // Bugünün tarihi
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Son tarih objesi
    const lastDate = new Date(latestDate);
    lastDate.setHours(0, 0, 0, 0);
    
    // Kaç gün kaldığını hesapla
    const daysRemaining = Math.floor((lastDate - today) / (1000 * 60 * 60 * 24));
    
    console.log(`Son namaz vakti tarihi: ${latestDate}`);
    console.log(`Kalan gün sayısı: ${daysRemaining}`);
    
    // Eğer 30 günden az kaldıysa, acil güncelleme yap
    if (daysRemaining < 30) {
      console.log('30 günden az veri kaldı, acil güncelleme yapılıyor...');
      await fetchAndSavePrayerTimes();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Acil durum güncelleme kontrolü sırasında hata:', error);
    return false;
  }
}

// Update logs tablosunu oluştur (eğer yoksa)
async function setupUpdateLogs() {
  try {
    // Tablo var mı kontrol et
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'update_logs'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('update_logs tablosu oluşturuluyor...');
      await db.query(`
        CREATE TABLE update_logs (
          id SERIAL PRIMARY KEY,
          update_type VARCHAR(50) NOT NULL,
          update_year INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(update_type, update_year)
        );
      `);
      console.log('update_logs tablosu oluşturuldu.');
    }
  } catch (error) {
    console.error('update_logs tablosu oluşturulurken hata:', error);
  }
}

// Yıllık güncelleme yapılmış mı kontrol et
async function checkYearlyUpdateStatus() {
  try {
    await setupUpdateLogs();
    
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const result = await db.query(`
      SELECT * FROM update_logs 
      WHERE update_type = 'yearly' AND update_year = $1
    `, [currentYear]);
    
    if (result.rows.length === 0) {
      console.log(`${currentYear} yılı için henüz yıllık güncelleme yapılmamış.`);
      return false;
    }
    
    const status = result.rows[0].status;
    console.log(`${currentYear} yılı yıllık güncelleme durumu: ${status}`);
    
    return status === 'completed';
  } catch (error) {
    console.error('Yıllık güncelleme durumu kontrolü sırasında hata:', error);
    return false;
  }
}

// Kasım kontrol işlemi
async function novemberCheck() {
  const now = new Date();
  const isNovember20 = now.getMonth() === 10 && now.getDate() === 20; // Kasım 0-indexed (10)
  
  if (isNovember20) {
    console.log('Bugün 20 Kasım, gelecek yıl verisini kontrol ediyoruz...');
    
    // Bu yıl için yıllık güncelleme yapılmış mı kontrol et
    const isUpdated = await checkYearlyUpdateStatus();
    
    if (!isUpdated) {
      // Gelecek yıl verisi kontrol edip, varsa indir
      const success = await yearlyFullUpdate();
      
      if (!success) {
        console.log('Gelecek yıl verisi henüz mevcut değil, 3 günde bir kontrol edilecek.');
        
        // Takip durumunu kaydet
        const currentYear = now.getFullYear();
        await db.query(`
          INSERT INTO update_logs (update_type, update_year, status, updated_at)
          VALUES ('yearly', $1, 'pending', NOW())
          ON CONFLICT (update_type, update_year) 
          DO UPDATE SET status = 'pending', updated_at = NOW()
        `, [currentYear]);
      }
    } else {
      console.log('Bu yıl için zaten yıllık güncelleme yapılmış.');
    }
  }
}

// Bekleyen güncelleme kontrolü
async function checkPendingUpdates() {
  try {
    await setupUpdateLogs();
    
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Bekleyen güncelleme var mı kontrol et
    const result = await db.query(`
      SELECT * FROM update_logs 
      WHERE update_type = 'yearly' AND update_year = $1 AND status = 'pending'
    `, [currentYear]);
    
    if (result.rows.length === 0) {
      return; // Bekleyen güncelleme yok
    }
    
    const lastUpdateDate = new Date(result.rows[0].updated_at);
    const daysSinceLastCheck = Math.floor((now - lastUpdateDate) / (1000 * 60 * 60 * 24));
    
    // Her 3 günde bir kontrol et
    if (daysSinceLastCheck >= 3) {
      console.log(`Son kontrolden ${daysSinceLastCheck} gün geçti, yeniden kontrol ediliyor...`);
      
      // Gelecek yıl verisi kontrol edip, varsa indir
      const success = await yearlyFullUpdate();
      
      if (!success) {
        // Durum hala beklemede, sadece son kontrol tarihini güncelle
        await db.query(`
          UPDATE update_logs 
          SET updated_at = NOW() 
          WHERE update_type = 'yearly' AND update_year = $1 AND status = 'pending'
        `, [currentYear]);
        
        console.log('Gelecek yıl verisi hala mevcut değil, 3 gün sonra tekrar kontrol edilecek.');
      }
    }
  } catch (error) {
    console.error('Bekleyen güncelleme kontrolü sırasında hata:', error);
  }
}

// Günlük kontrol
async function dailyCheck() {
  try {
    console.log('Günlük kontrol başlatılıyor...');
    
    // 1. Kasım 20 kontrolü yap
    await novemberCheck();
    
    // 2. Bekleyen güncelleme var mı kontrol et
    await checkPendingUpdates();
    
    // 3. Acil durum güncelleme kontrolü
    await emergencyUpdate();
    
    console.log('Günlük kontrol tamamlandı.');
  } catch (error) {
    console.error('Günlük kontrol sırasında hata:', error);
  }
}

// Çizelgeli çalıştırma
function scheduleUpdates() {
  console.log('Namaz vakitleri güncelleme çizelgesi başlatılıyor...');
  
  // Her gün kontrol et
  const dailySchedule = () => {
    const now = new Date();
    console.log(`${now.toISOString()} - Günlük kontrol başlatılıyor...`);
    dailyCheck();
  };
  
  // İlk çalıştırma
  dailyCheck();
  
  // Çizelge oluştur: Her gün
  const dailyInterval = 24 * 60 * 60 * 1000; // 24 saat
  setInterval(dailySchedule, dailyInterval);
  
  console.log('Güncelleme çizelgesi başlatıldı.');
}

// Scripti çalıştır
if (require.main === module) {
  scheduleUpdates();
} else {
  module.exports = { 
    scheduleUpdates, 
    dailyCheck, 
    yearlyFullUpdate, 
    checkNextYearData,
    emergencyUpdate
  };
} 