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
                'User-Agent': 'Mozilla/5.0 (compatible; NamazVaktiBot/1.0)'
            }
        });
    }

    async login() {
        try {
            console.log('Login fonksiyonu başladı');
            console.log('İstek gönderiliyor...');
            const response = await this.axiosInstance.post(`${this.baseURL}/Auth/Login`, {
                email: 'ozavciosman17@gmail.com',
                password: 'cN5+4q%F'
            });
            console.log('Yanıt alındı:', response.data);
            this.token = response.data.data.accessToken;
            this.refreshToken = response.data.data.refreshToken;
            return this.token;
        } catch (error) {
            console.error('Login fonksiyonunda hata:', error.message);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const response = await this.axiosInstance.post(`${this.baseURL}/Auth/RefreshToken/${this.refreshToken}`);
            this.token = response.data.data.accessToken;
            this.refreshToken = response.data.data.refreshToken;
            return this.token;
        } catch (error) {
            console.error('Token yenileme hatası:', error.message);
            throw error;
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
                await this.refreshToken();
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
                await this.refreshToken();
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
                await this.refreshToken();
                return this.getCities(stateId);
            }
            console.error('getCities hatası:', error.message);
            throw error;
        }
    }

    async getPrayerTimesByDateRange(cityId, startDate, endDate) {
        try {
            if (!this.token) {
                await this.login();
            }

            if (!cityId || !startDate || !endDate) {
                throw new Error('Şehir ID, başlangıç tarihi ve bitiş tarihi gereklidir.');
            }

            console.log(`İstek parametreleri: cityId=${cityId}, startDate=${startDate}, endDate=${endDate}`);
            
            const url = `${this.baseURL}/api/PrayerTime/DateRange`;
            
            const response = await this.axiosInstance.post(url, {
                cityId: cityId,
                endDate: endDate,
                startDate: startDate
            }, {
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
            if (error.response?.status === 401) {
                await this.refreshToken();
                return this.getPrayerTimesByDateRange(cityId, startDate, endDate);
            }
            console.error('getPrayerTimesByDateRange hatası:', error.message);
            throw error;
        }
    }
}

module.exports = new DiyanetService(); 