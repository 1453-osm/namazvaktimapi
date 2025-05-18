const express = require('express');
const router = express.Router();
const prayerTimeController = require('../controllers/prayerTimeController');

// Hata ayıklama middleware'i
router.use((req, res, next) => {
  console.log(`➡️ Prayer Times API İsteği: ${req.method} ${req.originalUrl}`);
  next();
});

// Test rotası
router.get('/test', (req, res) => {
  console.log('Test başarılı: Prayer Times API erişilebilir');
  res.status(200).json({
    status: 'success',
    message: 'Prayer Times API testinin sonucu başarılı',
    time: new Date().toISOString()
  });
});

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
router.get('/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Hata işleme için catch-all route
router.all('*', (req, res) => {
  console.log('⚠️ Bilinmeyen rota:', req.originalUrl);
  res.status(404).json({
    status: 'error',
    message: 'Belirtilen API endpointi bulunamadı'
  });
});

module.exports = router; 