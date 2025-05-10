// Namaz vakitlerini API'den çekip veritabanına kaydetme testi
const diyanetService = require('./services/diyanetService');
const prayerTimeModel = require('./models/prayerTimeModel');
const db = require('./config/db');

// Tarih formatını düzenleyen yardımcı fonksiyon
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
};

// Ana test fonksiyonu
const testFetchAndSave = async () => {
  try {
    console.log('Veritabanı bağlantısı test ediliyor...');
    await db.testConnection();
    
    // Rastgele bir ilçe seçmek için sorgu
    console.log('Rastgele bir ilçe seçiliyor...');
    const cityResult = await db.query(`
      SELECT c.*, s.name as state_name, co.name as country_name 
      FROM cities c
      JOIN states s ON c.state_id = s.id
      JOIN countries co ON s.country_id = co.id
      WHERE co.id = 2 AND s.id = 539 -- Türkiye ve İstanbul
      ORDER BY RANDOM()
      LIMIT 1
    `);
    
    if (cityResult.rows.length === 0) {
      console.log('Veritabanında uygun ilçe bulunamadı.');
      process.exit(1);
    }
    
    const selectedCity = cityResult.rows[0];
    console.log(`Seçilen ilçe: ${selectedCity.name} (${selectedCity.state_name}, ${selectedCity.country_name}) - ID: ${selectedCity.id}`);
    
    // Başlangıç ve bitiş tarihleri (bugün ve 10 gün sonrası)
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 10); // 10 günlük veri
    
    const startDateStr = formatDate(today);
    const endDateStr = formatDate(endDate);
    
    console.log(`Tarih aralığı: ${startDateStr} - ${endDateStr}`);
    
    // Diyanet API'den namaz vakitlerini al
    console.log('Diyanet API\'den namaz vakitleri getiriliyor...');
    const result = await diyanetService.getPrayerTimesByDateRange(
      selectedCity.id,
      startDateStr,
      endDateStr
    );
    
    if (result && result.data && result.data.length > 0) {
      console.log(`${result.data.length} günlük namaz vakti verisi başarıyla alındı.`);
      
      // API'den gelen verileri veritabanına kaydet
      console.log('Namaz vakitleri veritabanına kaydediliyor...');
      const savedData = await prayerTimeModel.createPrayerTimesInBulk(selectedCity.id, result.data);
      
      console.log(`${savedData.length} günlük namaz vakti verisi veritabanına kaydedildi.`);
      
      // Kaydedilen verilerin bir örneğini göster
      console.log('\nKaydedilen verilerden bir örnek:');
      console.log(JSON.stringify(savedData[0], null, 2));
      
    } else {
      console.log('Namaz vakti verisi alınamadı veya veri boş.');
    }
    
  } catch (error) {
    console.error('Test sırasında hata oluştu:', error);
  } finally {
    // Bağlantıyı kapat
    await db.pool.end();
  }
};

// Testi çalıştır
testFetchAndSave(); 