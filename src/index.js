const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const prayerTimeRoutes = require('./routes/prayerTimes');
const countryRoutes = require('./routes/countries');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');

// Scripts
const { scheduleMonthlyCleanup } = require('./scripts/cleanupOldPrayerTimes');

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

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
  res.json({ 
    status: 'success', 
    message: 'Namaz Vakti API çalışıyor',
    version: '1.0.0'
  });
});

// Sunucuyu başlat
const server = app.listen(PORT, () => {
  console.log(`Server başarıyla başlatıldı! 🚀`);
  console.log(`PORT: ${PORT}`);
  console.log(`Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://localhost:${PORT}`);
  
  // Zamanlanmış görevleri başlat
  scheduleMonthlyCleanup();
  console.log('Aylık temizleme görevi zamanlandı');
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