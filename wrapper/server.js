const http = require('http');
const { spawn } = require('child_process');

// HTTP sunucusu oluştur
const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Namaz Vakti API Cities Fetcher çalışıyor. İşlemi başlatmak için POST isteği gönderin.\n');
  } else if (req.method === 'POST' && req.url === '/start') {
    // İşlemi başlat
    console.log('İlçe verilerini çekme işlemi başlatılıyor...');
    
    // Script'i ayrı bir process olarak başlat
    const process = spawn('node', ['../src/scripts/fetchCities.js'], {
      detached: true, // Ana process'ten bağımsız çalışması için
      stdio: 'inherit'  // Log çıktılarını görmek için
    });
    
    // Process ID'yi döndür
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`İlçe verilerini çekme işlemi başlatıldı. Process ID: ${process.pid}\n`);
    
    // Process hataları
    process.on('error', (err) => {
      console.error('Script çalıştırma hatası:', err);
    });
    
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

// HTTP sunucusunu başlat
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 