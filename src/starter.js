/**
 * Cloud Run testi için tamamen minimalist bir Express API
 */
const express = require('express');
const cors = require('cors');

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 8080;

// Tüm ortam değişkenlerini logla
console.log('=== BAŞLATILIYOR ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Ortam değişkenleri:', Object.keys(process.env).join(', '));

// Middleware
app.use(cors());
app.use(express.json());

// Ana sayfa rotası
app.get('/', (req, res) => {
  console.log('Ana sayfa isteği alındı');
  res.json({
    status: 'success',
    message: 'Namaz Vakti API çalışıyor - Starter Version',
    env: process.env.NODE_ENV,
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

// Sağlık kontrolü rotası
app.get('/health', (req, res) => {
  console.log('Sağlık kontrolü yapıldı');
  res.status(200).json({ status: 'healthy' });
});

// Hata işleyici
app.use((err, req, res, next) => {
  console.error('API Hatası:', err.message);
  res.status(500).json({ error: 'Sunucu hatası', message: err.message });
});

// Sunucuyu başlat
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu başlatıldı. Port: ${PORT}`);
  console.log(`URL: http://0.0.0.0:${PORT}`);
});

// Hata yakalama
server.on('error', (error) => {
  console.error('Sunucu başlatma hatası:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Sinyalleri yakala
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, sunucu kapatılıyor');
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