const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Tüm ülkeleri getir
router.get('/', locationController.getCountries);

// Belirli bir ülke getir
router.get('/:id', locationController.getCountryById);

module.exports = router; 