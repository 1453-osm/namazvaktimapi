/**
 * Günlük içerikleri periyodik olarak çeken zamanlayıcı script
 */

const { exec } = require('child_process');
const path = require('path');

// Çalışma dizinini projenin kök dizini olarak ayarla
const rootDir = path.resolve(__dirname, '../../');

// Günlük içerikleri çek
function fetchDailyContent() {
    console.log('Günlük içerik güncelleme işlemi başlatılıyor...');
    console.log(`Çalışma dizini: ${rootDir}`);
    
    // npm script'i çalıştır
    exec('npm run fetch-daily-content', { cwd: rootDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Günlük içerik çekme hatası: ${error.message}`);
            return;
        }
        
        if (stderr) {
            console.error(`Günlük içerik çekme stderr: ${stderr}`);
        }
        
        console.log(`Günlük içerik çekme stdout: ${stdout}`);
        console.log('Günlük içerik güncelleme işlemi tamamlandı.');
    });
}

// İlk çalıştırma
fetchDailyContent();

// Her gün saat 00:05'te çalıştır (gece yarısından 5 dakika sonra)
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 saat (milisaniye cinsinden)

function scheduleNextRun() {
    const now = new Date();
    const nextRun = new Date();
    
    // Bir sonraki günün 00:05'ini ayarla
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(0, 5, 0, 0);
    
    // Bir sonraki çalışmaya kalan süre
    const timeUntilNextRun = nextRun - now;
    
    console.log(`Bir sonraki günlük içerik güncellemesi ${nextRun.toLocaleString()} tarihinde yapılacak (${Math.round(timeUntilNextRun / 1000 / 60)} dakika sonra).`);
    
    // Zamanlayıcıyı ayarla
    setTimeout(() => {
        fetchDailyContent();
        scheduleNextRun(); // Bir sonraki çalışmayı planla
    }, timeUntilNextRun);
}

// Zamanlayıcıyı başlat
scheduleNextRun();

console.log('Günlük içerik güncelleme zamanlayıcısı başlatıldı.');

// Çıkış sinyallerini yakala
process.on('SIGINT', () => {
    console.log('Günlük içerik güncelleme zamanlayıcısı durduruldu.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Günlük içerik güncelleme zamanlayıcısı durduruldu.');
    process.exit(0);
}); 