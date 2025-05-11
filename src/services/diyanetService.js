const axios = require('axios');
const https = require('https');

class DiyanetService {
    constructor() {
        this.baseURL = 'https://awqatsalah.diyanet.gov.tr';
        this.token = null;
        this.refreshToken = null;
        this.lastRequestTime = 0; // Son API isteği zamanını takip etmek için
        this.minRequestInterval = 200; // Milisaniye cinsinden minimum istek aralığı (saniyede 5 istek)
        
        // GitHub Actions ortamında mıyız kontrol et
        this.isGithubActions = process.env.GITHUB_ACTIONS === 'true';
        // Chunk ID'yi kontrol et - paralel çalışma için
        this.chunkId = process.env.CHUNK_ID || 'unknown';
        
        if (this.isGithubActions) {
            console.log(`DiyanetService: GitHub Actions ortamında çalışıyor (Chunk ID: ${this.chunkId})`);
        }
        
        this.axiosInstance = axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true
            }),
            // Paralel çalışma için daha kısa timeout süreleri
            timeout: this.isGithubActions ? 30000 : 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        
        // GitHub Actions için proxy kullanımı
        if (this.isGithubActions && process.env.HTTP_PROXY) {
            console.log(`Proxy kullanılıyor: ${process.env.HTTP_PROXY}`);
            const { HttpsProxyAgent } = require('https-proxy-agent');
            this.axiosInstance.defaults.httpsAgent = new HttpsProxyAgent(process.env.HTTP_PROXY);
        }
    }

    // İstek öncesi bekleme yapmak için (rate limiting)
    async throttleRequest() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await this.sleep(waitTime);
        }
        
        this.lastRequestTime = Date.now();
    }

    async login() {
        try {
            console.log('Login fonksiyonu başladı');
            
            // GitHub Actions ortamında ekstra loglama
            if (this.isGithubActions) {
                console.log(`Login URL: ${this.baseURL}/Auth/Login (Chunk ID: ${this.chunkId})`);
                console.log('Login isteği gönderiliyor (GitHub Actions)...');
            }
            
            const loginPayload = {
                email: 'ozavciosman17@gmail.com',
                password: 'cN5+4q%F'
            };
            
            let retryCount = 0;
            let loginError;
            
            // Login için yeniden deneme mekanizması
            while (retryCount < 3) {
                try {
                    // İstek öncesi hız sınırlaması uygula
                    await this.throttleRequest();
                    
                    const response = await this.axiosInstance.post(`${this.baseURL}/Auth/Login`, loginPayload);
                    
                    if (response.data && response.data.data && response.data.data.accessToken) {
                        this.token = response.data.data.accessToken;
                        this.refreshToken = response.data.data.refreshToken;
                        console.log('Token başarıyla alındı');
                        return this.token;
                    } else {
                        console.error('Login yanıtı geçersiz:', JSON.stringify(response.data));
                        throw new Error('Geçersiz login yanıtı');
                    }
                } catch (error) {
                    console.error(`Login denemesi ${retryCount + 1} başarısız:`, error.message);
                    loginError = error;
                    
                    if (error.response) {
                        console.error(`Hata durumu: ${error.response.status}`);
                        // GitHub Actions'da detaylı hata bilgisi
                        if (this.isGithubActions) {
                            console.error('Response headers:', JSON.stringify(error.response.headers));
                        }
                    }
                    
                    retryCount++;
                    // Paralel işlem için kademeli olarak artan bekleme süresi
                    const waitTime = Math.min(1000 * retryCount, 3000);
                    await this.sleep(waitTime);
                }
            }
            
            // Tüm denemeler başarısız oldu
            throw loginError || new Error('Login işlemi maksimum deneme sayısına ulaştı');
        } catch (error) {
            console.error('Login fonksiyonunda hata:', error.message);
            if (error.response) {
                console.error('Hata durumu:', error.response.status);
                console.error('Hata detayı:', JSON.stringify(error.response.data));
            }
            throw error;
        }
    }
    
    // Yardımcı sleep fonksiyonu
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('RefreshToken mevcut değil, önce login yapılmalı');
            }
            
            console.log('Token yenileniyor...');
            
            // İstek öncesi hız sınırlaması uygula
            await this.throttleRequest();
            
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
            
            // İstek öncesi hız sınırlaması uygula
            await this.throttleRequest();

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
            
            // İstek öncesi hız sınırlaması uygula
            await this.throttleRequest();

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
            
            // İstek öncesi hız sınırlaması uygula
            await this.throttleRequest();
            
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
            
            // İstek öncesi hız sınırlaması uygula
            await this.throttleRequest();
            
            try {
                // Doğrudan POST isteği kullan
                const response = await this.axiosInstance.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
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
                    
                    // GitHub Actions'da detaylı hata bilgisi
                    if (this.isGithubActions) {
                        console.error('Response headers:', JSON.stringify(error.response.headers));
                    }
                    
                    // 401 Unauthorized - Token yenileme gerekiyor
                    if (error.response.status === 401 && retryCount < 3) {
                        console.log('Token yenileniyor ve istek tekrarlanıyor...');
                        await this.refreshAccessToken();
                        // Token yeniledikten sonra kısa bir bekleme yaparak tekrar dene
                        await this.sleep(300);
                        return this.getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount + 1);
                    }
                    
                    // 404 Not Found - Endpoint bulunamadı
                    if (error.response.status === 404 && retryCount < 3) {
                        console.log('404 hatası alındı, yeniden login deneniyor...');
                        // Kısa bir bekleme süresi
                        await this.sleep(1000);
                        // Yeniden login ol
                        await this.login();
                        // Yeniden login olduktan sonra kısa bir bekleme
                        await this.sleep(300);
                        // Tekrar dene
                        return this.getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount + 1);
                    }
                    
                    // 429 Too Many Requests - Rate limiting
                    if (error.response.status === 429 && retryCount < 5) {
                        const waitTime = Math.pow(2, retryCount) * 1000; // Üssel geri çekilme
                        console.log(`Rate limit aşıldı, ${waitTime/1000} saniye bekleniyor...`);
                        await this.sleep(waitTime);
                        // Daha uzun bekleme süresi ile tekrar dene
                        this.minRequestInterval = Math.min(this.minRequestInterval * 1.5, 1000); // Rate limiti artır
                        return this.getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount + 1);
                    }
                    
                    // Diğer HTTP hataları
                    if (retryCount < 3) {
                        const waitTime = 1000 * (retryCount + 1);
                        console.log(`HTTP ${error.response.status} hatası, ${waitTime/1000} saniye bekleniyor...`);
                        await this.sleep(waitTime);
                        return this.getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount + 1);
                    }
                    
                    throw new Error(`Diyanet API isteği hatası (/api/PrayerTime/DateRange): ${error.response.status} - ${error.response.statusText}`);
                }
                
                // Ağ hataları için
                if (retryCount < 3) {
                    const waitTime = 1000 * (retryCount + 1);
                    console.log(`Ağ hatası, ${waitTime/1000} saniye bekleniyor...`);
                    await this.sleep(waitTime);
                    return this.getPrayerTimesByDateRange(cityId, startDate, endDate, retryCount + 1);
                }
                
                throw new Error(`Diyanet API isteği hatası (/api/PrayerTime/DateRange): ${error.message}`);
            }
        } catch (error) {
            console.error('getPrayerTimesByDateRange hatası:', error.message);
            throw error;
        }
    }
}

module.exports = new DiyanetService(); 