const axios = require('axios');

// Diyanet API temel URL
const DIYANET_API_BASE_URL = 'https://awqatsalah.diyanet.gov.tr';

// Diyanet API kullanıcı bilgileri
const DIYANET_EMAIL = process.env.DIYANET_EMAIL || 'ozavciosman17@gmail.com';
const DIYANET_PASSWORD = process.env.DIYANET_PASSWORD || 'cN5+4q%F';

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
      
      if (loginResponse.data && loginResponse.data.success === true && loginResponse.data.data) {
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
      
      if (refreshResponse.data && refreshResponse.data.success === true && refreshResponse.data.data) {
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
    console.error('Diyanet API token alma hatası:', error.message);
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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Diyanet API isteği hatası (${endpoint}):`, error.message);
    if (error.response) {
      console.error(`API yanıt detayları: Status: ${error.response.status}, Data:`, error.response.data);
    }
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
  const endpoints = [
    '/api/PrayerTime/DateRange', 
    '/api/PrayerTime/GetDateRange'
  ];
  
  for (const path of endpoints) {
    try {
      // POST metodu ile dene
      const result = await makeApiRequest(path, 'POST', {});
      
      if (result && result.success && result.data) {
        return result;
      }
      
      // GET metodu ile dene
      const getResult = await makeApiRequest(path, 'GET');
      
      if (getResult && getResult.success && getResult.data) {
        return getResult;
      }
    } catch (error) {
      console.error(`DateRange isteği başarısız (${path}):`, error.message);
    }
  }
  
  // Tüm istekler başarısız olduysa varsayılan tarih aralığı döndür
  const today = new Date();
  const nextYear = new Date(); 
  nextYear.setFullYear(today.getFullYear() + 1);
  
  return {
    success: true,
    data: {
      startDate: today.toISOString().split('T')[0],
      endDate: nextYear.toISOString().split('T')[0]
    }
  };
};

// [Günlük içerik kodu kaldırıldı]

// [Bayram bilgisini getirme kodu kaldırıldı]

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
const getPrayerTimesByDateRangeAndCity = async (cityId, startDate, endDate) => {
  const data = {
    cityId: parseInt(cityId),
    startDate,
    endDate
  };
  
  const endpoints = [
    '/api/PrayerTime/PrayerTimesByDateRange',
    '/api/PrayerTime/GetPrayerTimesByDateRange',
    '/api/PrayerTime/DateRange'
  ];
  
  for (const path of endpoints) {
    try {
      const result = await makeApiRequest(path, 'POST', data);
      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.error(`${path} isteği başarısız:`, error.message);
    }
  }
  
  throw new Error('Tüm namaz vakti endpoint istekleri başarısız oldu');
};

module.exports = {
  login: getToken,
  getCountries,
  getStates,
  getCities,
  getPrayerTimeDateRange,
  getPrayerTimesByDateRangeAndCity
}; 