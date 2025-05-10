const locationModel = require('../models/locationModel');
const diyanetApi = require('../utils/diyanetApi');

// Ülke kontrolcüleri
const getCountries = async (req, res) => {
  try {
    // Önce veritabanından ülkeleri kontrol edelim
    let countries = await locationModel.getCountries();
    
    // Veritabanında ülke yoksa Diyanet API'den çekelim
    if (countries.length === 0) {
      const diyanetCountries = await diyanetApi.getCountries();
      
      if (diyanetCountries && diyanetCountries.isSuccess && diyanetCountries.data) {
        // Diyanet API'den gelen ülkeleri veritabanına kaydedelim
        const savePromises = diyanetCountries.data.map(async (country) => {
          return await locationModel.createCountry(country.id, country.name);
        });
        
        await Promise.all(savePromises);
        
        // Güncel listeyi tekrar çekelim
        countries = await locationModel.getCountries();
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: countries
    });
  } catch (error) {
    console.error('Ülkeleri getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ülkeleri getirirken bir hata oluştu'
    });
  }
};

const getCountryById = async (req, res) => {
  try {
    const countryId = req.params.id;
    const country = await locationModel.getCountryById(countryId);
    
    if (!country) {
      return res.status(404).json({
        status: 'error',
        message: 'Ülke bulunamadı'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: country
    });
  } catch (error) {
    console.error('Ülke detaylarını getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ülke detaylarını getirirken bir hata oluştu'
    });
  }
};

// Şehir kontrolcüleri
const getStates = async (req, res) => {
  try {
    const countryId = req.query.countryId;
    let states;
    
    if (countryId) {
      // Belirli bir ülkeye ait şehirleri al
      states = await locationModel.getStatesByCountryId(countryId);
      
      // Veritabanında şehir yoksa Diyanet API'den çekelim
      if (states.length === 0) {
        const diyanetStates = await diyanetApi.getStates(countryId);
        
        if (diyanetStates && diyanetStates.isSuccess && diyanetStates.data) {
          // Diyanet API'den gelen şehirleri veritabanına kaydedelim
          const savePromises = diyanetStates.data.map(async (state) => {
            return await locationModel.createState(state.id, countryId, state.name);
          });
          
          await Promise.all(savePromises);
          
          // Güncel listeyi tekrar çekelim
          states = await locationModel.getStatesByCountryId(countryId);
        }
      }
    } else {
      // Tüm şehirleri al
      states = await locationModel.getStates();
    }
    
    res.status(200).json({
      status: 'success',
      data: states
    });
  } catch (error) {
    console.error('Şehirleri getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Şehirleri getirirken bir hata oluştu'
    });
  }
};

const getStateById = async (req, res) => {
  try {
    const stateId = req.params.id;
    const state = await locationModel.getStateById(stateId);
    
    if (!state) {
      return res.status(404).json({
        status: 'error',
        message: 'Şehir bulunamadı'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: state
    });
  } catch (error) {
    console.error('Şehir detaylarını getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Şehir detaylarını getirirken bir hata oluştu'
    });
  }
};

// İlçe kontrolcüleri
const getCities = async (req, res) => {
  try {
    const stateId = req.query.stateId;
    let cities;
    
    if (stateId) {
      // Belirli bir şehre ait ilçeleri al
      cities = await locationModel.getCitiesByStateId(stateId);
      
      // Veritabanında ilçe yoksa Diyanet API'den çekelim
      if (cities.length === 0) {
        const diyanetCities = await diyanetApi.getCities(stateId);
        
        if (diyanetCities && diyanetCities.isSuccess && diyanetCities.data) {
          // Diyanet API'den gelen ilçeleri veritabanına kaydedelim
          const savePromises = diyanetCities.data.map(async (city) => {
            return await locationModel.createCity(city.id, stateId, city.name);
          });
          
          await Promise.all(savePromises);
          
          // Güncel listeyi tekrar çekelim
          cities = await locationModel.getCitiesByStateId(stateId);
        }
      }
    } else {
      // Tüm ilçeleri al
      cities = await locationModel.getCities();
    }
    
    res.status(200).json({
      status: 'success',
      data: cities
    });
  } catch (error) {
    console.error('İlçeleri getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'İlçeleri getirirken bir hata oluştu'
    });
  }
};

const getCityById = async (req, res) => {
  try {
    const cityId = req.params.id;
    const city = await locationModel.getCityById(cityId);
    
    if (!city) {
      return res.status(404).json({
        status: 'error',
        message: 'İlçe bulunamadı'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: city
    });
  } catch (error) {
    console.error('İlçe detaylarını getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'İlçe detaylarını getirirken bir hata oluştu'
    });
  }
};

module.exports = {
  // Ülke
  getCountries,
  getCountryById,
  
  // Şehir
  getStates,
  getStateById,
  
  // İlçe
  getCities,
  getCityById
}; 