const { createClient } = require('@libsql/client');
require('dotenv').config({ optional: true });

// Bağlantı bilgileri
const tursoUrl = process.env.TURSO_DATABASE_URL || 'libsql://namazvaktimdb-1453-osm.aws-us-east-1.turso.io';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDY4ODg0NjQsImlkIjoiMzg3MDQ0OTktMjcwZS00M2U1LWFiMTEtNjQ1ZDhmNDEzMWQwIiwicmlkIjoiZjUyYzNiYTQtMDUxZS00MDlmLThkOGUtODdkY2Q2NjdlYWI1In0.oKUkQ9I0kIz4dMWa94aqZy9ksNGIKRXYjGEx6medoi8zJ-Vu26-kozApR-8rrtH1RVDPzva3YC4-qzklVkAsAw';

// Bağlantı durumu
let connectionState = {
  isConnected: false,
  lastConnected: null,
  lastConnectionAttempt: 0,
  failedAttempts: 0,
  client: null
};

// Bağlantı URL'sini maskeleme (güvenlik için)
console.log('Turso veritabanı bilgileri yükleniyor...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TURSO_DATABASE_URL:', tursoUrl.substring(0, 20) + "...");
console.log('TURSO_AUTH_TOKEN: (uzunluk)', tursoAuthToken ? tursoAuthToken.length : 0);

// Client yapılandırmasını ayarla
const clientConfig = {
  url: tursoUrl,
  authToken: tursoAuthToken
};
console.log('Turso istemci yapılandırması:', JSON.stringify(clientConfig).replace(tursoAuthToken, '[GİZLİ]'));

// Veritabanı istemcisi oluşturma fonksiyonu
const createDbClient = () => {
  try {
    console.log('Yeni Turso istemcisi oluşturuluyor...');
    connectionState.lastConnectionAttempt = Date.now();
    
    const newClient = createClient(clientConfig);
    connectionState.client = newClient;
    
    console.log('Turso istemcisi başarıyla oluşturuldu');
    return newClient;
  } catch (error) {
    console.error('Turso istemcisi oluşturma hatası:', error.message);
    connectionState.failedAttempts += 1;
    
    // Boş bir istemci döndür, sonraki isteklerde yeniden deneyecek
    return null;
  }
};

// İlk bağlantıyı oluştur
connectionState.client = createDbClient();

// Bağlantı yenileme konfigürasyonu
const CONNECTION_RETRY_INTERVAL = 10000; // 10 saniye
const MAX_RETRY_ATTEMPTS = 5; // Maximum deneme sayısı
const RESET_FAILURES_AFTER = 60000; // 1 dakika sonra hata sayacını sıfırla

// Bağlantıyı test et
const testConnection = async () => {
  try {
    console.log('Turso veritabanı bağlantısı test ediliyor...');
    
    // Client yoksa yeniden oluştur
    if (!connectionState.client) {
      console.log('İstemci bulunamadı, yeniden oluşturuluyor...');
      connectionState.client = createDbClient();
      if (!connectionState.client) {
        return false;
      }
    }
    
    const result = await execute('SELECT datetime("now") as current_time');
    
    connectionState.isConnected = true;
    connectionState.lastConnected = Date.now();
    connectionState.failedAttempts = 0;
    
    console.log('Turso veritabanı bağlantısı başarılı! Sunucu zamanı:', result.rows[0].current_time);
    return true;
  } catch (err) {
    console.error('Turso veritabanı bağlantı testi başarısız:', err.message);
    
    connectionState.isConnected = false;
    connectionState.failedAttempts += 1;
    
    return false;
  }
};

// İstemciyi yenileme fonksiyonu
const refreshClient = () => {
  const now = Date.now();
  
  // Belirli bir süre geçmeden tekrar deneme
  if (now - connectionState.lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
    console.log('Son yenileme girişiminden yeterli süre geçmedi, atlanıyor...');
    return false;
  }
  
  // Belirli bir süreden sonra hata sayacını sıfırla
  if (now - connectionState.lastConnectionAttempt > RESET_FAILURES_AFTER) {
    console.log('Hata sayacı sıfırlanıyor...');
    connectionState.failedAttempts = 0;
  }
  
  // Maksimum deneme sayısı aşıldıysa yeni istemci oluşturmayı durdur
  if (connectionState.failedAttempts >= MAX_RETRY_ATTEMPTS) {
    console.log(`Maksimum deneme sayısına ulaşıldı (${MAX_RETRY_ATTEMPTS}). İstemci yenilenmiyor.`);
    return false;
  }
  
  try {
    console.log('Turso istemcisi yenileniyor...');
    connectionState.lastConnectionAttempt = now;
    
    const newClient = createDbClient();
    if (newClient) {
      connectionState.client = newClient;
      console.log('Turso istemcisi başarıyla yenilendi');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Turso istemcisi yenileme hatası:', error.message);
    connectionState.failedAttempts += 1;
    return false;
  }
};

// Sorgu çalıştır
const execute = async (sql, args = []) => {
  try {
    const queryStart = Date.now();
    let result;
    
    // İstemci yoksa yeniden oluştur
    if (!connectionState.client) {
      console.log('İstemci bulunamadı, yeniden oluşturuluyor...');
      refreshClient();
      
      if (!connectionState.client) {
        throw new Error('Veritabanı istemcisi oluşturulamadı');
      }
    }
    
    try {
      result = await connectionState.client.execute({ sql, args });
    } catch (initialError) {
      console.error('İlk sorgu denemesi başarısız:', initialError.message);
      
      // Bağlantı hatası olabilir, istemciyi yenilemeyi dene
      if (initialError.message.includes('connection') || 
          initialError.message.includes('bağlantı') ||
          initialError.message.includes('network') ||
          initialError.message.includes('timeout')) {
        
        console.log('Bağlantı hatası tespit edildi, istemci yenileniyor...');
        const refreshed = refreshClient();
        
        if (refreshed && connectionState.client) {
          // Yeniden dene
          console.log('Bağlantı yenilendi, sorguyu tekrar deniyorum...');
          result = await connectionState.client.execute({ sql, args });
        } else {
          throw new Error('Veritabanı bağlantısı sağlanamadı ve istemci yenilenemedi');
        }
      } else {
        // Bağlantı hatası değilse, hatayı yeniden fırlat
        throw initialError;
      }
    }
    
    // Bağlantı başarılı olduğunda durumu güncelle
    connectionState.isConnected = true;
    connectionState.lastConnected = Date.now();
    connectionState.failedAttempts = 0;
    
    const queryTime = Date.now() - queryStart;
    console.log(`SQL sorgusu (${queryTime}ms): ${sql.replace(/\s+/g, ' ').trim()}`);
    console.log(`Sonuç satır sayısı: ${result.rows?.length || 0}`);
    
    return result;
  } catch (error) {
    console.error('Turso veritabanı sorgusu hatası:', error.message);
    console.error('Sorgu:', sql);
    console.error('Parametreler:', args);
    
    // Bağlantı durumunu güncelle
    connectionState.isConnected = false;
    
    throw error;
  }
};

// Bağlantı durumunu getir
const getConnectionState = () => {
  return {
    isConnected: connectionState.isConnected,
    lastConnected: connectionState.lastConnected,
    lastConnectionAttempt: connectionState.lastConnectionAttempt,
    failedAttempts: connectionState.failedAttempts
  };
};

// Başlangıçta bağlantıyı doğrula
(async () => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('İlk bağlantı testi başarılı!');
    } else {
      console.error('İlk bağlantı testi başarısız. Uygulamanın veritabanı işlevleri çalışmayabilir.');
    }
  } catch (err) {
    console.error('İlk bağlantı testi sırasında hata:', err.message);
  }
})();

module.exports = {
  client: connectionState.client,
  testConnection,
  execute,
  refreshClient,
  getConnectionState
}; 