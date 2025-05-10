// Diyanet API endpoint testleri
const axios = require('axios');
const https = require('https');

// Axios instance oluştur
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NamazVaktiBot/1.0)',
    'Content-Type': 'application/json'
  }
});

// API bilgileri
const baseURL = 'https://awqatsalah.diyanet.gov.tr';
const email = 'ozavciosman17@gmail.com';
const password = 'cN5+4q%F';

// Giriş yapma ve token alma
async function login() {
  try {
    console.log('Login isteği gönderiliyor...');
    const response = await axiosInstance.post(`${baseURL}/Auth/Login`, {
      email: email,
      password: password
    });
    
    console.log('Login başarılı!');
    return response.data.data;
  } catch (error) {
    console.error('Login hatası:', error.message);
    if (error.response) {
      console.error('Hata durumu:', error.response.status);
      console.error('Hata detayı:', error.response.data);
    }
    throw error;
  }
}

// Namaz vakitlerini al
async function getPrayerTimesByDateRange(token, cityId, startDate, endDate) {
  try {
    console.log(`\nTarih aralığı isteği gönderiliyor...`);
    console.log(`URL: ${baseURL}/api/PrayerTime/DateRange`);
    console.log(`Parametreler: cityId=${cityId}, startDate=${startDate}, endDate=${endDate}`);
    
    const response = await axiosInstance.post(`${baseURL}/api/PrayerTime/DateRange`, {
      cityId: cityId,
      endDate: endDate,
      startDate: startDate
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`İstek başarılı! Durum kodu: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`DateRange isteği hatası: ${error.message}`);
    if (error.response) {
      console.error('Hata durumu:', error.response.status);
      console.error('Hata mesajı:', error.response.statusText);
      console.error('Hata detayı:', error.response.data);
    } else if (error.request) {
      console.error('İstek gönderildi ancak yanıt alınamadı');
    }
    throw error;
  }
}

// Doğru endpoint URL'sini kontrol et
async function checkAvailableEndpoints(token) {
  try {
    console.log('\nKullanılabilir endpoint\'leri kontrol ediyorum...');
    
    // API kök endpoint'ini kontrol et
    try {
      const rootResponse = await axiosInstance.get(`${baseURL}/api`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('API kök endpoint yanıtı:', rootResponse.status);
    } catch (error) {
      console.log('API kök endpoint hatası:', error.message);
    }
    
    // Alternatif namaz vakti endpoint'lerini kontrol et
    const endpoints = [
      '/api/PrayerTime',
      '/api/PrayerTime/DateRange',
      '/api/PrayerTimes/DateRange',
      '/api/Prayer/DateRange'
    ];
    
    for (const endpoint of endpoints) {
      try {
        await axiosInstance.options(`${baseURL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`${endpoint}: Erişilebilir`);
      } catch (error) {
        console.log(`${endpoint}: ${error.response ? error.response.status : 'Erişilemez'}`);
      }
    }
  } catch (error) {
    console.error('Endpoint kontrolü hatası:', error.message);
  }
}

// Ana test fonksiyonu
async function testDiyanetApi() {
  try {
    // Giriş yap
    const authData = await login();
    const token = authData.accessToken;
    console.log(`Token alındı: ${token.substring(0, 20)}...`);
    
    // Kullanılabilir endpoint'leri kontrol et
    await checkAvailableEndpoints(token);
    
    // Örnek ilçe ve tarih ile test et
    const cityId = 9538; // Istanbul-Çatalca
    const startDate = '2025-05-10';
    const endDate = '2025-05-20';
    
    const result = await getPrayerTimesByDateRange(token, cityId, startDate, endDate);
    
    if (result && result.data && result.data.length > 0) {
      console.log(`\nToplam ${result.data.length} günlük namaz vakti alındı!`);
      console.log('İlk gün örneği:');
      console.log(JSON.stringify(result.data[0], null, 2));
    } else {
      console.log('\nVeri alınamadı veya boş veri döndü.');
      console.log('API yanıtı:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('Test sırasında hata oluştu:', error.message);
  }
}

// Testi çalıştır
console.log('Diyanet API endpoint testi başlatılıyor...');
testDiyanetApi().then(() => {
  console.log('\nTest tamamlandı.');
}); 