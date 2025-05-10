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
            timeout: 15000,
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

            const response = await this.axiosInstance.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                await this.refreshToken();
                return this.getCities(stateId);
            }
            throw error;
        }
    }
}

module.exports = new DiyanetService(); 