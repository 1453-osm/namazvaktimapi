const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const prayerTimeRoutes = require('./routes/prayerTimes');
const countryRoutes = require('./routes/countries');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');

// Scripts - Şimdilik devre dışı bırakıyoruz
// const { scheduleMonthlyCleanup } = require('./scripts/cleanupOldPrayerTimes');

// Veritabanı bağlantısını ekleyelim
const { testConnection } = require('./config/turso');

// Config
dotenv.config({ path: process.env.NODE_ENV === 'production' ? null : '.env', debug: process.env.DEBUG === 'true', optional: true });
const app = express();
const PORT = process.env.PORT || 8080;

// Ortam değişkenlerini logla
console.log('=== BAŞLATILIYOR ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'Tanımlı (gizli)' : 'Tanımlı değil');
console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'Tanımlı (gizli)' : 'Tanımlı değil');
console.log('Ortam değişkenleri:', Object.keys(process.env).join(', '));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route Middlewares
app.use('/api/prayer-times', prayerTimeRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);

// Sağlık kontrolü
app.get('/', (req, res) => {
  console.log('Ana sayfa isteği alındı');
  res.json({ 
    status: 'success', 
    message: 'Namaz Vakti API çalışıyor - Route\'lar Eklendi',
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

// Veritabanı bağlantı testi rotası
app.get('/api/db-test', async (req, res) => {
  console.log('Veritabanı bağlantı testi isteği alındı');
  try {
    const isConnected = await testConnection();
    res.json({
      status: isConnected ? 'success' : 'error',
      message: isConnected ? 'Veritabanı bağlantısı başarılı' : 'Veritabanı bağlantısı başarısız',
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Veritabanı bağlantı testi hatası:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Veritabanı bağlantı testi başarısız: ' + error.message,
      time: new Date().toISOString()
    });
  }
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
  
  // Veritabanı bağlantısını test et
  testConnection()
    .then(isConnected => {
      console.log(`Veritabanı bağlantısı: ${isConnected ? 'Başarılı' : 'Başarısız'}`);
    })
    .catch(error => {
      console.error('Veritabanı bağlantı testi hatası:', error.message);
    });
  
  // Zamanlanmış görevleri başlat - Şimdilik devre dışı bırakıyoruz
  // scheduleMonthlyCleanup();
  // console.log('Aylık temizleme görevi zamanlandı');
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