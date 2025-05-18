const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const countryRoutes = require('./routes/countries');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');
// const prayerTimeRoutes = require('./routes/prayerTimes');  // Eski router'ı kullanmayacağız

// Controller doğrudan içe aktarılıyor
const prayerTimeController = require('./controllers/prayerTimeController');
const locationController = require('./controllers/locationController');

// Scripts
const { scheduleMonthlyCleanup } = require('./scripts/cleanupOldPrayerTimes');

// Veritabanı bağlantısı ve şema kontrolü
const { testConnection } = require('./config/turso');
const { checkAndCreateSchema } = require('./utils/checkSchema');

// Config
dotenv.config({ path: process.env.NODE_ENV === 'production' ? null : '.env', debug: process.env.DEBUG === 'true', optional: true });

// Express uygulamasını oluştur
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

// Route Middlewares - Konum API'leri
app.use('/api/countries', countryRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
// app.use('/api/prayer-times', prayerTimeRoutes);
// app.use('/api/prayertimes', prayerTimeRoutes);
// app.use('/api/prayer_times', prayerTimeRoutes);

// Doğrudan namaz vakti endpointleri tanımla
app.get('/api/prayers/test', (req, res) => {
  console.log('Namaz vakitleri test isteği alındı');
  res.json({
    status: 'success',
    message: 'Namaz vakitleri API test başarılı',
    time: new Date().toISOString()
  });
});

// Test endpoint'leri - underscore formatı (veritabanı isimlendirmesi ile uyumlu)
app.get('/api/prayer_times/test', (req, res) => {
  console.log('Prayer_Times (underscore) test isteği alındı');
  res.json({
    status: 'success',
    message: 'Prayer_Times API test başarılı',
    time: new Date().toISOString()
  });
});

// Belirli bir ilçe ve tarih için namaz vakitlerini getir (doğrudan controller fonksiyonu)
app.get('/api/prayers/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Alternatif path: /api/prayer-times/:cityId/:date
app.get('/api/prayer-times/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Alternatif path: /api/prayertimes/:cityId/:date
app.get('/api/prayertimes/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Veritabanı ile uyumlu path: /api/prayer_times/:cityId/:date
app.get('/api/prayer_times/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
app.get('/api/prayers/range/:cityId', prayerTimeController.getPrayerTimesByDateRange);
app.get('/api/prayer-times/range/:cityId', prayerTimeController.getPrayerTimesByDateRange);
app.get('/api/prayertimes/range/:cityId', prayerTimeController.getPrayerTimesByDateRange);
app.get('/api/prayer_times/range/:cityId', prayerTimeController.getPrayerTimesByDateRange);

// Belirli bir ilçe için bayram namazı vakitlerini getir
app.get('/api/prayers/eid/:cityId', prayerTimeController.getEidTimes);
app.get('/api/prayer-times/eid/:cityId', prayerTimeController.getEidTimes);
app.get('/api/prayertimes/eid/:cityId', prayerTimeController.getEidTimes);
app.get('/api/prayer_times/eid/:cityId', prayerTimeController.getEidTimes);

// Ana sayfa
app.get('/', (req, res) => {
  console.log('Ana sayfa isteği alındı');
  res.json({ 
    status: 'success', 
    message: 'Namaz Vakti API çalışıyor',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    endpoints: {
      prayers: '/api/prayers/:cityId/:date',
      prayer_times: '/api/prayer_times/:cityId/:date',
      prayerRange: '/api/prayers/range/:cityId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      prayer_timesRange: '/api/prayer_times/range/:cityId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      eid: '/api/prayers/eid/:cityId',
      eid_prayer_times: '/api/prayer_times/eid/:cityId',
      countries: '/api/countries',
      states: '/api/states',
      statesByCountry: '/api/states?countryId=:countryId',
      cities: '/api/cities',
      citiesByState: '/api/cities?stateId=:stateId'
    }
  });
});

// API test rotaları
app.get('/api/test', (req, res) => {
  console.log('Test API isteği alındı');
  res.json({
    status: 'success',
    message: 'API test rotası çalışıyor',
    time: new Date().toISOString()
  });
});

app.get('/api/prayer-times/test', (req, res) => {
  console.log('Prayer Times test isteği alındı');
  res.json({
    status: 'success',
    message: 'Prayer Times API test rotası çalışıyor',
    time: new Date().toISOString()
  });
});

app.get('/api/prayertimes/test', (req, res) => {
  console.log('PrayerTimes (alternatif) test isteği alındı');
  res.json({
    status: 'success',
    message: 'PrayerTimes alternatif API test rotası çalışıyor',
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

// API Durum kontrolü rotası - basit bir 200 OK yanıt döner
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API çalışıyor',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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
  
  // Veritabanı bağlantısını test et
  testConnection()
    .then(isConnected => {
      console.log(`Veritabanı bağlantısı: ${isConnected ? 'Başarılı' : 'Başarısız'}`);
      
      // Veritabanı bağlantısı başarılıysa zamanlanmış görevleri başlat
      if (isConnected) {
        // Veritabanı şemasını kontrol et ve eksik tablolar varsa oluştur
        checkAndCreateSchema()
          .then(schemaResult => {
            console.log('Şema kontrolü sonucu:', schemaResult.message);
            
            // Zamanlanmış görevleri başlat
            try {
              scheduleMonthlyCleanup();
              console.log('Aylık temizleme görevi zamanlandı');
            } catch (error) {
              console.error('Zamanlanmış görevleri başlatırken hata:', error.message);
            }
          })
          .catch(schemaError => {
            console.error('Şema kontrolü hatası:', schemaError.message);
          });
      }
    })
    .catch(error => {
      console.error('Veritabanı bağlantı testi hatası:', error.message);
    });
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
  
  // Cloud Run'da hata detaylarını zenginleştir
  if (process.env.NODE_ENV === 'production') {
    console.error('Hata zamanı:', new Date().toISOString());
    console.error('Process uptime:', process.uptime());
    console.error('Bellek kullanımı:', process.memoryUsage());
    console.error('Ortam bilgileri:', {
      node_env: process.env.NODE_ENV,
      node_version: process.version,
      platform: process.platform,
      pid: process.pid,
      port: process.env.PORT,
    });
  }
  
  // 30 saniye süre tanı ve kapat
  setTimeout(() => process.exit(1), 30000);
});

// Promise rejection hatalarını yakala
process.on('unhandledRejection', (reason, promise) => {
  console.error('Yakalanmayan Promise reddi:', reason);
  
  // Cloud Run'da hata detaylarını zenginleştir
  if (process.env.NODE_ENV === 'production') {
    console.error('Hata zamanı:', new Date().toISOString());
    console.error('Process uptime:', process.uptime());
  }
  
  // Uygulamayı çökertme, sadece logla
  // Bu tür hataların istekleri etkilememesi için
}); 