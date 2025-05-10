// Namaz vakitleri tarih aralığı API testi
const diyanetService = require('./services/diyanetService');
const locationModel = require('./models/locationModel');
const db = require('./config/db');

// Tarih formatını düzenleyen yardımcı fonksiyon
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
};

// Ana test fonksiyonu
const testDateRange = async () => {
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
    
    // Sonuçları göster
    if (result && result.data && result.data.length > 0) {
      console.log(`${result.data.length} günlük namaz vakti verisi başarıyla alındı.`);
      
      // API'den dönen tam veri yapısını kontrol edelim
      console.log('\nAPI\'den dönen ilk günün tam veri yapısı:');
      console.log(JSON.stringify(result.data[0], null, 2));
      
      // Gelen verideki tüm anahtarları görelim (ilk eleman için)
      console.log('\nİlk günün verisindeki anahtarlar:');
      console.log(Object.keys(result.data[0]));
      
      // İlk üç günün verilerini detaylı göster
      console.log('\nİlk 3 günün namaz vakitleri:');
      for (let i = 0; i < Math.min(3, result.data.length); i++) {
        const day = result.data[i];
        console.log(`\n${i+1}. Gün:`);
        console.log('-------------------------------');
        for (const [key, value] of Object.entries(day)) {
          console.log(`${key}: ${value}`);
        }
      }
      
      // Gregorian ve Hicri tarih bilgilerini kontrol et
      console.log('\nTarih bilgisi kontrolü:');
      result.data.slice(0, 3).forEach((day, index) => {
        console.log(`${index + 1}. Gün - Gregorian: ${day.gregorianDateShort || day.gregorianDate}, Hicri: ${day.hijriDateShort || day.hijriDate}`);
      });
      
      // Tüm günlerin özeti
      console.log('\nTüm günlerin özeti:');
      result.data.forEach((day, index) => {
        // Her kayıt için hangi tarih formatını kullanabileceğimizi belirle
        const dateInfo = day.gregorianDateShort || day.gregorianDate || day.date || `Gün ${index + 1}`;
        console.log(`${index + 1}. ${dateInfo}: İmsak ${day.fajr}, Akşam ${day.maghrib}`);
      });
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
testDateRange(); 