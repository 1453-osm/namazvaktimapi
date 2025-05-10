const express = require('express');
const router = express.Router();
const prayerTimeController = require('../controllers/prayerTimeController');

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
router.get('/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
router.get('/:cityId/range', prayerTimeController.getPrayerTimesByDateRange);

// Belirli bir ilçe için bayram namazı vakitlerini getir
router.get('/:cityId/eid', prayerTimeController.getEidTimes);

module.exports = router; 