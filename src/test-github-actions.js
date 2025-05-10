// GitHub Actions ortamı için Diyanet API testi
const diyanetService = require('./services/diyanetService');

// GitHub Actions ortamını simüle et
process.env.GITHUB_ACTIONS = 'true';

async function testGitHubActionsEnv() {
  try {
    console.log('GitHub Actions ortamı simülasyon testi başlatılıyor...');
    
    // Login test
    console.log('\n--- LOGIN TESTİ ---');
    await diyanetService.login();
    console.log('Login başarılı ✓');
    
    // Örnek ilçe ID ve tarih aralığı
    const cityId = 9538; // Istanbul-Çatalca
    const startDate = '2025-05-10';
    const endDate = '2025-05-15';
    
    // DateRange API testi
    console.log('\n--- PRAYER TIME DATE RANGE TESTİ ---');
    console.log(`İlçe ID: ${cityId}, Tarih aralığı: ${startDate} - ${endDate}`);
    
    try {
      const result = await diyanetService.getPrayerTimesByDateRange(cityId, startDate, endDate);
      
      if (result && result.data && result.data.length > 0) {
        console.log(`✓ Başarılı! ${result.data.length} günlük veri alındı.`);
        console.log('İlk günün verisi:');
        console.log(JSON.stringify(result.data[0], null, 2));
      } else {
        console.log('✗ API yanıt verdi ancak veri boş veya geçersiz.');
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('✗ DateRange API testi başarısız:', error.message);
      throw error;
    }
    
    // Tüm testler başarılı
    console.log('\n✓✓✓ GitHub Actions simülasyon testi başarıyla tamamlandı! ✓✓✓');
    
  } catch (error) {
    console.error('GitHub Actions simülasyon testi başarısız oldu:', error.message);
    process.exit(1);
  }
}

// Testi çalıştır
testGitHubActionsEnv().catch(err => {
  console.error('Test sırasında yakalanan hata:', err);
  process.exit(1);
}); 