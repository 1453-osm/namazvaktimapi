const express = require('express');
const router = express.Router();
const prayerTimeController = require('../controllers/prayerTimeController');

// Hata ayıklama middleware'i
router.use((req, res, next) => {
  console.log(`Prayer Times API İsteği: ${req.method} ${req.originalUrl}`);
  next();
});

// Test rotası
router.get('/test', (req, res) => {
  console.log('Prayer Times test rotası çalıştırıldı');
  res.status(200).json({
    status: 'success',
    message: 'Prayer Times API testi başarılı',
    time: new Date().toISOString()
  });
});

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
router.get('/:cityId/range', prayerTimeController.getPrayerTimesByDateRange);

// Belirli bir ilçe için bayram namazı vakitlerini getir
router.get('/:cityId/eid', prayerTimeController.getEidTimes);

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
router.get('/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Hata yakalama middleware'i
router.use((err, req, res, next) => {
  console.error('Prayer Times API Hatası:', err);
  res.status(500).json({
    status: 'error',
    message: 'Prayer Times API hatası: ' + (err.message || 'Bilinmeyen hata')
  });
});

module.exports = router; 