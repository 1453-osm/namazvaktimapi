const axios = require('axios');
const https = require('https');

class DiyanetService {
    constructor() {
        this.baseURL = 'https://awqatsalah.diyanet.gov.tr';
        this.token = null;
        this.refreshToken = null;
        this.axiosInstance = axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            }),
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NamazVaktiBot/1.0)',
                'Content-Type': 'application/json'
            }
        });
    }

    async login() {
        try {
            console.log('Login fonksiyonu başladı');
            const response = await this.axiosInstance.post(`${this.baseURL}/Auth/Login`, {
                email: 'ozavciosman17@gmail.com',
                password: 'cN5+4q%F'
            });
            
            if (response.data && response.data.data && response.data.data.accessToken) {
                this.token = response.data.data.accessToken;
                this.refreshToken = response.data.data.refreshToken;
                console.log('Token başarıyla alındı');
                return this.token;
            } else {
                console.error('Login yanıtı geçersiz:', response.data);
                throw new Error('Geçersiz login yanıtı');
            }
        } catch (error) {
            console.error('Login fonksiyonunda hata:', error.message);
            if (error.response) {
                console.error('Hata durumu:', error.response.status);
                console.error('Hata detayı:', JSON.stringify(error.response.data));
            }
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('RefreshToken mevcut değil, önce login yapılmalı');
            }
            
            console.log('Token yenileniyor...');
            const response = await this.axiosInstance.post(`${this.baseURL}/Auth/RefreshToken/${this.refreshToken}`);
            
            if (response.data && response.data.data) {
                this.token = response.data.data.accessToken;
                this.refreshToken = response.data.data.refreshToken;
                console.log('Token başarıyla yenilendi');
                return this.token;
            } else {
                console.error('Token yenileme yanıtı geçersiz:', response.data);
                throw new Error('Geçersiz token yenileme yanıtı');
            }
        } catch (error) {
            console.error('Token yenileme hatası:', error.message);
            if (error.response) {
                console.error('Hata durumu:', error.response.status);
                console.error('Hata detayı:', JSON.stringify(error.response.data));
            }
            // Token yenileme başarısız olursa yeniden login yap
            await this.login();
            return this.token;
        }
    }

    async getCountries() {
        try {
            if (!this.token) {
                await this.login();
            }

            const response = await this.axiosInstance.get(`${this.baseURL}/api/Place/Countries`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                await this.refreshAccessToken();
                return this.getCountries();
            }
            throw error;
        }
    }

    async getStates(countryId = null) {
        try {
            if (!this.token) {
                await this.login();
            }

            const url = countryId 
                ? `${this.baseURL}/api/Place/States/${countryId}`
                : `${this.baseURL}/api/Place/States`;

            const response = await this.axiosInstance.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                await this.refreshAccessToken();
                return this.getStates(countryId);
            }
            throw error;
        }
    }

    async getCities(stateId = null) {
        try {
            if (!this.token) {
                await this.login();
            }

            const url = stateId 
                ? `${this.baseURL}/api/Place/Cities/${stateId}`
                : `${this.baseURL}/api/Place/Cities`;

            console.log(`İstek URL: ${url}`);
            
            const response = await this.axiosInstance.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            console.log(`API yanıt kodu: ${response.status}`);
            
            if (!response.data) {
                console.log('API yanıtı boş veya geçersiz');
                return { data: [] };
            }
            
            let responseData = response.data;
            
            if (responseData && responseData.data) {
                return { data: responseData.data };
            } else if (Array.isArray(responseData)) {
                return { data: responseData };
            } else {
                console.log('Beklenmeyen API yanıt yapısı:', responseData);
                return { data: [] };
            }
        } catch (error) {
            if (error.response?.status === 401) {
                await this.refreshAccessToken();
                return this.getCities(stateId);
            }
            console.error('getCities hatası:', error.message);
            throw error;
        }
    }

    async getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount = 0) {
        try {
            if (!this.token) {
                await this.login();
            }

            if (!cityId || !startDate || !endDate) {
                throw new Error('Şehir ID, başlangıç tarihi ve bitiş tarihi gereklidir.');
            }

            console.log(`İstek parametreleri: cityId=${cityId}, startDate=${startDate}, endDate=${endDate}`);
            
            const url = `${this.baseURL}/api/PrayerTime/DateRange`;
            
            // Günlük payloadu detaylı logla
            const payload = {
                cityId: cityId,
                endDate: endDate,
                startDate: startDate
            };
            console.log('İstek payload:', JSON.stringify(payload));
            
            try {
                const response = await this.axiosInstance.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`API yanıt kodu: ${response.status}`);
                
                if (!response.data) {
                    console.log('API yanıtı boş veya geçersiz');
                    return { data: [] };
                }
                
                let responseData = response.data;
                
                if (responseData && responseData.data) {
                    console.log(`${responseData.data.length} günlük namaz vakti verisi alındı`);
                    return { data: responseData.data };
                } else if (Array.isArray(responseData)) {
                    console.log(`${responseData.length} günlük namaz vakti verisi alındı`);
                    return { data: responseData };
                } else {
                    console.log('Beklenmeyen API yanıt yapısı:', JSON.stringify(responseData).substring(0, 200) + '...');
                    return { data: [] };
                }
            } catch (error) {
                console.error(`DateRange isteği hatası:`, error.message);
                if (error.response) {
                    console.error('Hata durumu:', error.response.status);
                    console.error('Hata detayı:', JSON.stringify(error.response.data || {}));
                    
                    // 401 Unauthorized - Token yenileme gerekiyor
                    if (error.response.status === 401 && retryCount < 3) {
                        console.log('Token yenileniyor ve istek tekrarlanıyor...');
                        await this.refreshAccessToken();
                        return this.getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount + 1);
                    }
                    
                    // 404 Not Found - Endpoint bulunamadı
                    if (error.response.status === 404) {
                        throw new Error(`Diyanet API isteği hatası (/api/PrayerTime/DateRange): Endpoint bulunamadı (404)`);
                    }
                    
                    // Diğer HTTP hataları
                    throw new Error(`Diyanet API isteği hatası (/api/PrayerTime/DateRange): ${error.response.status} - ${error.response.statusText}`);
                }
                
                // Ağ hataları için
                throw new Error(`Diyanet API isteği hatası (/api/PrayerTime/DateRange): ${error.message}`);
            }
        } catch (error) {
            console.error('getPrayerTimesByDateRange hatası:', error.message);
            throw error;
        }
    }
}

module.exports = new DiyanetService(); 