const { client } = require('../config/turso');

/**
 * Bir haftadan daha eski namaz vakitlerini silen fonksiyon
 * Bu fonksiyon her ayın 1'inde çalıştırılacak
 */
async function cleanupOldPrayerTimes() {
  try {
    console.log('Eski namaz vakitleri temizleme işlemi başlatılıyor...');
    
    // Bugünün tarihini al
    const today = new Date();
    
    // Bir hafta öncesinin tarihini hesapla
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    
    // Tarih formatını YYYY-MM-DD şeklinde ayarla
    const cutoffDate = oneWeekAgo.toISOString().split('T')[0];
    
    console.log(`Kesim tarihi: ${cutoffDate} - Bu tarihten önce olan namaz vakitleri silinecek`);
    
    // Silinecek kayıt sayısını kontrol et
    const countResult = await client.execute({
      sql: `SELECT COUNT(*) as count FROM prayer_times WHERE prayer_date < ?`,
      args: [cutoffDate]
    });
    
    const recordsToDelete = countResult.rows[0].count;
    console.log(`Silinecek kayıt sayısı: ${recordsToDelete}`);
    
    if (recordsToDelete === 0) {
      console.log('Silinecek eski kayıt bulunmamaktadır.');
      return 0;
    }
    
    // Eski kayıtları sil
    const deleteResult = await client.execute({
      sql: `DELETE FROM prayer_times WHERE prayer_date < ?`,
      args: [cutoffDate]
    });
    
    console.log(`Toplam ${deleteResult.rowsAffected} adet eski namaz vakti kaydı silindi.`);
    
    // Silme işlemi logunu kaydet
    await client.execute({
      sql: `
        INSERT INTO cleanup_logs (
          cleanup_type, records_deleted, cutoff_date, created_at
        ) VALUES (?, ?, ?, datetime('now'))
      `,
      args: ['old_prayer_times', deleteResult.rowsAffected, cutoffDate]
    });
    
    return deleteResult.rowsAffected;
  } catch (error) {
    console.error('Eski namaz vakitleri temizlenirken hata oluştu:', error);
    return -1;
  }
}

/**
 * Cleanup logs tablosunu oluştur (eğer yoksa)
 */
async function setupCleanupLogs() {
  try {
    // Tablo var mı kontrol et
    const tableExists = await client.execute({
      sql: `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='cleanup_logs'
      `
    });
    
    if (tableExists.rows.length === 0) {
      console.log('cleanup_logs tablosu oluşturuluyor...');
      await client.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS cleanup_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cleanup_type TEXT NOT NULL,
            records_deleted INTEGER NOT NULL,
            cutoff_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      });
      console.log('cleanup_logs tablosu oluşturuldu.');
    }
  } catch (error) {
    console.error('cleanup_logs tablosu oluşturulurken hata:', error);
  }
}

/**
 * Her ayın 1'inde çalışacak fonksiyon
 */
async function scheduleMonthlyCleanup() {
  console.log('Aylık temizleme çizelgesi başlatılıyor...');
  
  // GitHub Actions ortamında mı kontrol et
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  
  // Cleanup logs tablosunu kontrol et ve oluştur
  await setupCleanupLogs();
  
  // GitHub Actions ortamında ise hemen çalıştır ve çık
  if (isGithubActions) {
    console.log('GitHub Actions ortamında çalışıyor, hemen temizleme yapılacak...');
    await cleanupOldPrayerTimes();
    return;
  }
  
  // Bir sonraki ayın 1'ini hesapla
  const scheduleNextCleanup = () => {
    const now = new Date();
    console.log(`Şu anki zaman: ${now.toISOString()}`);
    
    // Bir sonraki ayın 1'i saat 03:00 UTC
    let targetDate = new Date();
    targetDate.setDate(1); // Ayın 1'i
    targetDate.setHours(3, 0, 0, 0); // Saat 03:00:00.000
    
    // Eğer bugün ayın 1'i ve saat henüz 03:00'dan önceyse, bugün için ayarla
    if (now.getDate() === 1 && now.getHours() < 3) {
      targetDate = new Date(now.getFullYear(), now.getMonth(), 1, 3, 0, 0, 0);
    } else {
      // Değilse, bir sonraki ayın 1'i için ayarla
      targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 3, 0, 0, 0);
    }
    
    // Hedef tarihe ne kadar kaldığını hesapla
    const timeUntilTarget = targetDate.getTime() - now.getTime();
    
    console.log(`Hedef tarih: ${targetDate.toISOString()}`);
    console.log(`Hedef tarihe kalan süre: ${Math.floor(timeUntilTarget / (1000 * 60 * 60 * 24))} gün ${Math.floor((timeUntilTarget % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))} saat ${Math.floor((timeUntilTarget % (1000 * 60 * 60)) / (1000 * 60))} dakika`);
    
    // Hedef tarihte çalışacak işlevi planla
    setTimeout(async () => {
      console.log('Aylık temizleme işlemi başlatılıyor...');
      
      // Temizleme işlemini çalıştır
      await cleanupOldPrayerTimes();
      
      // Bir sonraki ayın temizleme zamanını planla
      scheduleNextCleanup();
    }, timeUntilTarget);
  };
  
  // İlk planlamayı başlat
  scheduleNextCleanup();
  
  console.log('Aylık temizleme çizelgesi başlatıldı.');
}

// Scripti doğrudan çalıştırıldığında
if (require.main === module) {
  // GitHub Actions ortamında mı kontrol et
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  
  if (isGithubActions) {
    // GitHub Actions'da sadece temizleme işlemini yap
    (async () => {
      await setupCleanupLogs();
      await cleanupOldPrayerTimes();
      console.log('GitHub Actions temizleme işlemi tamamlandı.');
    })();
  } else {
    // Normal ortamda zamanlanmış görevi başlat
    scheduleMonthlyCleanup();
  }
} else {
  // Modül olarak kullanıldığında
  module.exports = {
    cleanupOldPrayerTimes,
    scheduleMonthlyCleanup,
    setupCleanupLogs
  };
} 