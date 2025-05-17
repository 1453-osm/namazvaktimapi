const express = require('express');
const cors = require('cors');

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 8080;

// Ortam değişkenlerini logla
console.log('=== BAŞLATILIYOR ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Ortam değişkenleri:', Object.keys(process.env).join(', '));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ana sayfa
app.get('/', (req, res) => {
  console.log('Ana sayfa isteği alındı');
  res.json({ 
    status: 'success', 
    message: 'Namaz Vakti API çalışıyor - Minimal Versiyon',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// API test rotası
app.get('/api/test', (req, res) => {
  console.log('Test API isteği alındı');
  res.json({
    status: 'success',
    message: 'API test rotası çalışıyor',
    time: new Date().toISOString()
  });
});

// Mockup dummmy API endpoints
app.get('/api/countries', (req, res) => {
  console.log('Countries API isteği alındı');
  res.json({
    status: 'success',
    message: 'Mock ülke listesi',
    data: [
      { id: 1, name: 'Türkiye' },
      { id: 2, name: 'Almanya' },
      { id: 3, name: 'İngiltere' }
    ]
  });
});

app.get('/api/states', (req, res) => {
  console.log('States API isteği alındı');
  res.json({
    status: 'success',
    message: 'Mock şehir listesi',
    data: [
      { id: 1, country_id: 1, name: 'İstanbul' },
      { id: 2, country_id: 1, name: 'Ankara' },
      { id: 3, country_id: 1, name: 'İzmir' }
    ]
  });
});

app.get('/api/cities', (req, res) => {
  console.log('Cities API isteği alındı');
  res.json({
    status: 'success',
    message: 'Mock ilçe listesi',
    data: [
      { id: 1, state_id: 1, name: 'Kadıköy' },
      { id: 2, state_id: 1, name: 'Üsküdar' },
      { id: 3, state_id: 1, name: 'Beşiktaş' }
    ]
  });
});

app.get('/api/prayer-times', (req, res) => {
  console.log('Prayer Times API isteği alındı');
  const today = new Date();
  res.json({
    status: 'success',
    message: 'Mock namaz vakitleri',
    data: [
      {
        date: today.toISOString().split('T')[0],
        city_id: 1,
        imsak: '05:30',
        gunes: '07:00',
        ogle: '12:30',
        ikindi: '15:45',
        aksam: '18:30',
        yatsi: '20:00'
      }
    ]
  });
});

// Hata işleyici
app.use((err, req, res, next) => {
  console.error('API Hatası:', err.message);
  res.status(500).json({ error: 'Sunucu hatası', message: err.message });
});

// Sunucuyu başlat
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu başarıyla başlatıldı! 🚀`);
  console.log(`PORT: ${PORT}`);
  console.log(`Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://0.0.0.0:${PORT}`);
});

// Hata yakalama
server.on('error', (error) => {
  console.error('Sunucu başlatma hatası:', error.message);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} zaten kullanımda! Farklı bir port seçin.`);
  }
  
  // Kritik hatada uygulamayı sonlandır
  process.exit(1);
});

// Sinyalleri yakala
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

// Yakalanmayan hataları logla
process.on('uncaughtException', (error) => {
  console.error('Yakalanmayan hata:', error.message);
  console.error(error.stack);
  // 30 saniye süre tanı ve kapat
  setTimeout(() => process.exit(1), 30000);
}); 