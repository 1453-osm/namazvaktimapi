/**
 * Namaz vakitleri güncelleme çizelgesi
 * Bu script, belirli zamanlarda namaz vakitlerini güncellemek için kullanılır.
 * 
 * Turso veritabanı kullanır.
 */

// Gerekli modülleri import et
const diyanetApi = require('../utils/diyanetApi');
const { client } = require('../config/turso');

// diyanetService modülünü import et
const diyanetService = require('../services/diyanetService');

// Diyanet API'den destek verilen tarih aralığını kontrol et
async function checkSupportedDateRange() {
  try {
    // API'den desteklenen tarih aralığını al
    const response = await diyanetApi.getPrayerTimeDateRange();
    
    if (!response || !response.success) {
      console.log('Tarih aralığı API yanıtı başarısız:', response);
      return null;
    }
    
    return response.data;
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

// Namaz vakitlerini çek ve kaydet
async function fetchAllPrayerTimes() {
  try {
    console.log('Tüm namaz vakitlerini çekme işlemi başlatılıyor...');
    
    // Turso modülünü doğrudan import et
    const tursoModule = require('./turso/fetchAllPrayerTimesForTurso');
    
    // Fonksiyonu çağır
    const result = await tursoModule.fetchAllPrayerTimes();
    
    console.log('Namaz vakitleri çekme işlemi tamamlandı.');
    return result;
  } catch (error) {
    console.error('Namaz vakitleri çekme işlemi sırasında hata:', error);
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
      await fetchAllPrayerTimes();
      
      // İşlemi bu yıl için tamamlandı olarak işaretle
      const now = new Date();
      const year = now.getFullYear();
      await client.execute({
        sql: `
          INSERT OR REPLACE INTO update_logs (update_type, update_year, status, updated_at)
          VALUES (?, ?, ?, datetime('now'))
        `,
        args: ['yearly', year, 'completed']
      });
      
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
    const latestDateResult = await client.execute({
      sql: 'SELECT MAX(prayer_date) as latest_date FROM prayer_times'
    });
    
    const latestDate = latestDateResult.rows[0].latest_date;
    
    if (!latestDate) {
      console.log('Veritabanında hiç veri yok, tam güncelleme yapılacak.');
      await fetchAllPrayerTimes();
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
      await fetchAllPrayerTimes();
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
    const tableExists = await client.execute({
      sql: `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='update_logs'
      `
    });
    
    if (tableExists.rows.length === 0) {
      console.log('update_logs tablosu oluşturuluyor...');
      await client.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS update_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            update_type TEXT NOT NULL,
            update_year INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(update_type, update_year)
          )
        `
      });
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
    
    const result = await client.execute({
      sql: `
        SELECT * FROM update_logs 
        WHERE update_type = ? AND update_year = ?
      `,
      args: ['yearly', currentYear]
    });
    
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

// 11 Mayıs kontrolü işlemi
async function novemberCheck() {
  const now = new Date();
  
  // 20 Kasım saat 09:00 GMT+00:00 kontrolü
  const isNov20 = now.getMonth() === 10 && now.getDate() === 20; // Kasım 0-indexed (10)
  const isCorrectTime = now.getUTCHours() === 9 && now.getUTCMinutes() === 0;
  
  // GitHub Actions için her zaman çalışmasını sağla
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  
  if (isGithubActions || (isNov20 && isCorrectTime)) {
    console.log('20 Kasım saat 09:00 GMT+00:00 kontrolü veya GitHub Actions çalışması başlatılıyor...');
    
    // Bu yıl için yıllık güncelleme yapılmış mı kontrol et
    const isUpdated = await checkYearlyUpdateStatus();
    
    if (!isUpdated) {
      // Gelecek yıl verisi kontrol edip, varsa indir
      const success = await yearlyFullUpdate();
      
      if (!success) {
        console.log('Gelecek yıl verisi henüz mevcut değil, 3 günde bir kontrol edilecek.');
        
        // Takip durumunu kaydet
        const currentYear = now.getFullYear();
        await client.execute({
          sql: `
            INSERT OR REPLACE INTO update_logs (update_type, update_year, status, updated_at)
            VALUES (?, ?, ?, datetime('now'))
          `,
          args: ['yearly', currentYear, 'pending']
        });
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
    const result = await client.execute({
      sql: `
        SELECT * FROM update_logs 
        WHERE update_type = ? AND update_year = ? AND status = ?
      `,
      args: ['yearly', currentYear, 'pending']
    });
    
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
        await client.execute({
          sql: `
            UPDATE update_logs 
            SET updated_at = datetime('now')
            WHERE update_type = ? AND update_year = ? AND status = ?
          `,
          args: ['yearly', currentYear, 'pending']
        });
        
        console.log('Gelecek yıl verisi hala mevcut değil, 3 gün sonra tekrar kontrol edilecek.');
      }
    }
  } catch (error) {
    console.error('Bekleyen güncelleme kontrolü sırasında hata:', error);
  }
}

// Çizelgeli çalıştırma
function scheduleUpdates() {
  console.log('Namaz vakitleri güncelleme çizelgesi başlatılıyor...');
  
  // 20 Kasım 09:00 GMT+00:00 tarihinde çalışacak işlevi ayarlayalım
  const scheduleSpecificDateCheck = () => {
    const now = new Date();
    console.log(`Şu anki zaman: ${now.toISOString()}`);
    
    // Bir sonraki 20 Kasım 09:00 GMT+00:00 tarihini hesaplayalım
    let targetDate = new Date(Date.UTC(now.getFullYear(), 10, 20, 9, 0, 0)); // Kasım 0-indexed (10)
    
    // Eğer bu yılın 20 Kasım tarihi geçtiyse, gelecek yılı ayarlayalım
    if (now > targetDate) {
      targetDate = new Date(Date.UTC(now.getFullYear() + 1, 10, 20, 9, 0, 0));
    }
    
    // Hedef tarihe ne kadar kaldığını hesaplayalım
    const timeUntilTarget = targetDate.getTime() - now.getTime();
    
    console.log(`Hedef tarih: ${targetDate.toISOString()}`);
    console.log(`Hedef tarihe kalan süre: ${Math.floor(timeUntilTarget / (1000 * 60 * 60 * 24))} gün ${Math.floor((timeUntilTarget % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))} saat ${Math.floor((timeUntilTarget % (1000 * 60 * 60)) / (1000 * 60))} dakika`);
    
    // Hedef tarihte çalışacak işlevi planlayalım
    setTimeout(() => {
      console.log('20 Kasım 09:00 GMT+00:00 kontrolü başlatılıyor...');
      
      // Kontrolleri çalıştır
      novemberCheck();
      checkPendingUpdates();
      emergencyUpdate();
      
      // Bir sonraki yılın kontrol zamanını planla
      scheduleSpecificDateCheck();
    }, timeUntilTarget);
  };
  
  // İlk planlamayı başlat
  scheduleSpecificDateCheck();
  
  console.log('Güncelleme çizelgesi başlatıldı.');
}

// Scripti çalıştır
if (require.main === module) {
  scheduleUpdates();
} else {
  module.exports = { 
    scheduleUpdates, 
    novemberCheck, 
    checkPendingUpdates,
    yearlyFullUpdate, 
    checkNextYearData,
    emergencyUpdate
  };
} 