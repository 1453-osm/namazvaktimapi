const axios = require('axios');

// Diyanet API temel URL
const DIYANET_API_BASE_URL = 'https://awqatsalah.diyanet.gov.tr';

// Diyanet API kullanıcı bilgileri
const DIYANET_EMAIL = 'ozavciosman17@gmail.com';
const DIYANET_PASSWORD = 'cN5+4q%F';

// Token bilgilerini tutacağız
let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

// Yardımcı fonksiyonlar
const isTokenExpired = () => {
  if (!tokenExpiry) return true;
  return new Date() >= tokenExpiry;
};

// Token alma/yenileme işlemi
const getToken = async () => {
  try {
    // Token geçerli mi kontrol et
    if (accessToken && !isTokenExpired()) {
      return accessToken;
    }
    
    // Token yoksa veya süresi dolmuşsa yeni token al
    if (!refreshToken || isTokenExpired()) {
      // Login işlemi
      const loginResponse = await axios.post(`${DIYANET_API_BASE_URL}/Auth/Login`, {
        email: DIYANET_EMAIL,
        password: DIYANET_PASSWORD
      });
      
      if (loginResponse.data && loginResponse.data.isSuccess) {
        accessToken = loginResponse.data.data.accessToken;
        refreshToken = loginResponse.data.data.refreshToken;
        
        // Token süresi 55 dakika olarak ayarla (varsayılan 1 saat)
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 55);
        tokenExpiry = expiryDate;
        
        return accessToken;
      }
      
      throw new Error('Diyanet API giriş başarısız: ' + JSON.stringify(loginResponse.data));
    } else {
      // Refresh token ile yenileme
      const refreshResponse = await axios.get(`${DIYANET_API_BASE_URL}/Auth/RefreshToken/${refreshToken}`);
      
      if (refreshResponse.data && refreshResponse.data.isSuccess) {
        accessToken = refreshResponse.data.data.accessToken;
        refreshToken = refreshResponse.data.data.refreshToken;
        
        // Token süresi 55 dakika olarak ayarla (varsayılan 1 saat)
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 55);
        tokenExpiry = expiryDate;
        
        return accessToken;
      }
      
      throw new Error('Diyanet API token yenileme başarısız: ' + JSON.stringify(refreshResponse.data));
    }
  } catch (error) {
    console.error('Diyanet API token alma hatası:', error);
    throw error;
  }
};

// API istekleri için yardımcı fonksiyon
const makeApiRequest = async (endpoint, method = 'GET', data = null) => {
  try {
    const token = await getToken();
    
    const config = {
      method,
      url: `${DIYANET_API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Diyanet API isteği hatası (${endpoint}):`, error);
    throw error;
  }
};

// Ülkeleri getir
const getCountries = async () => {
  return makeApiRequest('/api/Place/Countries');
};

// Şehirleri getir
const getStates = async (countryId) => {
  const endpoint = countryId 
    ? `/api/Place/States/${countryId}` 
    : '/api/Place/States';
  return makeApiRequest(endpoint);
};

// İlçeleri getir
const getCities = async (stateId) => {
  const endpoint = stateId 
    ? `/api/Place/Cities/${stateId}` 
    : '/api/Place/Cities';
  return makeApiRequest(endpoint);
};

// Namaz vakitleri için tarih aralığını getir
const getPrayerTimeDateRange = async () => {
  return makeApiRequest('/api/PrayerTime/DateRange');
};

// Günlük içerik getir
const getDailyContent = async () => {
  return makeApiRequest('/api/DailyContent');
};

// Bayram bilgisini getir
const getEid = async (cityId) => {
  return makeApiRequest(`/api/PrayerTime/Eid/${cityId}`);
};

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
const getPrayerTimesByDateRangeAndCity = async (cityId, startDate, endDate) => {
  // İstek verisi oluştur
  const data = {
    cityId: parseInt(cityId),
    startDate,
    endDate
  };
  
  return makeApiRequest('/api/PrayerTime/PrayerTimesByDateRange', 'POST', data);
};

module.exports = {
  getCountries,
  getStates,
  getCities,
  getPrayerTimeDateRange,
  getDailyContent,
  getEid,
  getPrayerTimesByDateRangeAndCity
}; 