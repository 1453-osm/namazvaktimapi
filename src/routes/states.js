const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Tüm şehirleri veya bir ülkenin şehirlerini getir (query ile ?countryId=123)
router.get('/', locationController.getStates);

// Belirli bir şehri getir
router.get('/:id', locationController.getStateById);

module.exports = router; 