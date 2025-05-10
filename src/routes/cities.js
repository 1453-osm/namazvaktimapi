const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Tüm ilçeleri veya bir şehrin ilçelerini getir (query ile ?stateId=123)
router.get('/', locationController.getCities);

// Belirli bir ilçeyi getir
router.get('/:id', locationController.getCityById);

module.exports = router; 