// Minimal test sunucusu
const http = require('http');

const PORT = process.env.PORT || 8080;

console.log('Basit test sunucusu başlatılıyor...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Ortam değişkenleri:', Object.keys(process.env).join(', '));

// Basit HTTP sunucusu oluştur
const server = http.createServer((req, res) => {
  console.log(`Gelen istek: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'success',
    message: 'Namaz Vakti API test sunucusu çalışıyor',
    version: '1.0.0',
    env: process.env.NODE_ENV,
    url: req.url,
    method: req.method,
    time: new Date().toISOString()
  }));
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

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`Test sunucusu başarıyla başlatıldı! Port: ${PORT}`);
});

// Sinyalleri yakala
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Yakalanmamış istisna:', error.message);
  console.error(error.stack);
  // Kritik hatalar için 30 saniye bekle ve kapat
  setTimeout(() => {
    process.exit(1);
  }, 30000);
}); 