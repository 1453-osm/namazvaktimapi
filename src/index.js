const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const countryRoutes = require('./routes/countries');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');
// const prayerTimeRoutes = require('./routes/prayerTimes');  // Eski router'ı kullanmayacağız

// Controller doğrudan içe aktarılıyor
const prayerTimeController = require('./controllers/prayerTimeController');
const locationController = require('./controllers/locationController');
const tempController = require('./controllers/tempController');

// Scripts
const { scheduleMonthlyCleanup } = require('./scripts/cleanupOldPrayerTimes');

// Veritabanı bağlantısı ve şema kontrolü
const { testConnection, execute } = require('./config/turso');
const { checkAndCreateSchema, inspectTableSchema } = require('./utils/checkSchema');

// Config
dotenv.config({ path: process.env.NODE_ENV === 'production' ? null : '.env', debug: process.env.DEBUG === 'true', optional: true });

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 8080;

// Ortam değişkenlerini logla
console.log('=== BAŞLATILIYOR ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'Tanımlı (gizli)' : 'Tanımlı değil');
console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'Tanımlı (gizli)' : 'Tanımlı değil');
console.log('Ortam değişkenleri:', Object.keys(process.env).join(', '));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route Middlewares - Konum API'leri
app.use('/api/countries', countryRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
// app.use('/api/prayer-times', prayerTimeRoutes);
// app.use('/api/prayertimes', prayerTimeRoutes);
// app.use('/api/prayer_times', prayerTimeRoutes);

// TÜM ENDPOINT'LERİ YENİDEN TANIMLIYORUM
// ÖNEMLİ: Yönlendirme sorunlarını çözmek için tüm endpointleri sırayla tanımlıyorum
console.log('Endpointler yeniden tanımlanıyor...');

// 1. TEST ENDPOINT'LERİ
app.get('/api/test', (req, res) => {
  console.log('Test API isteği alındı');
  res.json({
    status: 'success',
    message: 'API test rotası çalışıyor',
    time: new Date().toISOString()
  });
});

// 2. NAMAZ VAKİTLERİ - TEKİL TARİH ENDPOINTLERİ
console.log('Tekil tarih endpointleri tanımlanıyor');
app.get('/api/prayers/:cityId/:date', prayerTimeController.getPrayerTimeByDate);
app.get('/api/prayer-times/:cityId/:date', prayerTimeController.getPrayerTimeByDate);
app.get('/api/prayertimes/:cityId/:date', prayerTimeController.getPrayerTimeByDate);
app.get('/api/prayer_times/:cityId/:date', prayerTimeController.getPrayerTimeByDate);

// 3. NAMAZ VAKİTLERİ - TARİH ARALIĞI ENDPOINTLERİ - ÖZEL OLARAK AYRILDI
console.log('Tarih aralığı endpointleri tanımlanıyor');

// Tarih aralığı için özel endpoint - City ID'yi direkt query string'den al
app.get('/api/prayers/daterange', (req, res) => {
  console.log('Prayers DateRange API (query ile): ', req.query);
  const { cityId, startDate, endDate } = req.query;
  
  if (!cityId) {
    return res.status(400).json({
      status: 'error',
      message: 'cityId parametresi gerekli',
      path: req.path,
      query: req.query
    });
  }
  
  // cityId'yi params objesine ekleyerek controller'a aktar
  req.params = { ...req.params, cityId };
  return prayerTimeController.getPrayerTimesByDateRange(req, res);
});

// Alternatif yazımlar
app.get('/api/prayer-times/daterange', (req, res) => {
  req.params = { ...req.params, cityId: req.query.cityId };
  return prayerTimeController.getPrayerTimesByDateRange(req, res);
});

app.get('/api/prayertimes/daterange', (req, res) => {
  req.params = { ...req.params, cityId: req.query.cityId };
  return prayerTimeController.getPrayerTimesByDateRange(req, res);
});

app.get('/api/prayer_times/daterange', (req, res) => {
  req.params = { ...req.params, cityId: req.query.cityId };
  return prayerTimeController.getPrayerTimesByDateRange(req, res);
});

// 4. CityId'nin path parametresi olarak kullanıldığı yeni tarih aralığı endpointleri
app.get('/api/prayers/daterange/:cityId', (req, res) => {
  console.log('Özel Tarih Aralığı İsteği - Path Parametresi ile:');
  console.log('URL:', req.originalUrl);
  console.log('İstek Query Parametreleri:', req.query);
  console.log('İstek Path Parametreleri:', req.params);
  
  const { cityId } = req.params;
  const { startDate, endDate } = req.query;
  
  console.log(`🔍 TARİH ARALIĞI (ÖZEL) => İlçe Kodu: ${cityId}, Başlangıç: ${startDate}, Bitiş: ${endDate}`);
  
  // Tüm parametrelerin varlığını kontrol et
  if (!cityId || !startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'İlçe ID, başlangıç tarihi ve bitiş tarihi parametreleri gerekli',
      received: {
        cityId: cityId || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  }
  
  // Tarih formatı kontrolü
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı',
      received: {
        startDate,
        endDate
      }
    });
  }
  
  // Doğrudan Diyanet API'den al
  const diyanetApi = require('./utils/diyanetApi');
  
  diyanetApi.getPrayerTimesByDateRangeAndCity(cityId, startDate, endDate)
    .then(prayerTimesResponse => {
      if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
        console.log(`✅ Diyanet API'den veri alındı, veri sayısı: ${prayerTimesResponse.data.length}`);
        
        // Model fonksiyonu olmadan doğrudan API verilerini döndür
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: prayerTimesResponse.data
        });
      } else {
        console.log(`❌ Diyanet API'den veri alınamadı veya veri boş`);
        
        return res.status(404).json({
          status: 'error',
          message: 'Belirtilen tarih aralığında namaz vakti verisi bulunamadı',
          params: { cityId, startDate, endDate }
        });
      }
    })
    .catch(error => {
      console.error(`❌ Diyanet API hatası:`, error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'Namaz vakitleri alınırken bir hata oluştu: ' + error.message
      });
    });
});

// Diğer tarih aralığı endpoint'leri için de aynı özel fonksiyonu kullan
app.get('/api/prayer-times/daterange/:cityId', (req, res) => {
  console.log('Özel Tarih Aralığı İsteği (prayer-times) - Path Parametresi ile:');
  
  const { cityId } = req.params;
  const { startDate, endDate } = req.query;
  
  console.log(`🔍 TARİH ARALIĞI (ÖZEL) => İlçe Kodu: ${cityId}, Başlangıç: ${startDate}, Bitiş: ${endDate}`);
  
  // Özel controller'ı tekrar yazıp çağırıyoruz
  // Tüm parametrelerin varlığını kontrol et
  if (!cityId || !startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'İlçe ID, başlangıç tarihi ve bitiş tarihi parametreleri gerekli',
      received: {
        cityId: cityId || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  }
  
  // Tarih formatı kontrolü
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı',
      received: {
        startDate,
        endDate
      }
    });
  }
  
  // Doğrudan Diyanet API'den al
  const diyanetApi = require('./utils/diyanetApi');
  
  diyanetApi.getPrayerTimesByDateRangeAndCity(cityId, startDate, endDate)
    .then(prayerTimesResponse => {
      if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
        console.log(`✅ Diyanet API'den veri alındı, veri sayısı: ${prayerTimesResponse.data.length}`);
        
        // Model fonksiyonu olmadan doğrudan API verilerini döndür
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: prayerTimesResponse.data
        });
      } else {
        console.log(`❌ Diyanet API'den veri alınamadı veya veri boş`);
        
        return res.status(404).json({
          status: 'error',
          message: 'Belirtilen tarih aralığında namaz vakti verisi bulunamadı',
          params: { cityId, startDate, endDate }
        });
      }
    })
    .catch(error => {
      console.error(`❌ Diyanet API hatası:`, error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'Namaz vakitleri alınırken bir hata oluştu: ' + error.message
      });
    });
});

app.get('/api/prayertimes/daterange/:cityId', (req, res) => {
  // Aynı işlemi yap
  const { cityId } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!cityId || !startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'İlçe ID, başlangıç tarihi ve bitiş tarihi parametreleri gerekli'
    });
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı'
    });
  }
  
  const diyanetApi = require('./utils/diyanetApi');
  
  diyanetApi.getPrayerTimesByDateRangeAndCity(cityId, startDate, endDate)
    .then(prayerTimesResponse => {
      if (prayerTimesResponse?.success && prayerTimesResponse?.data?.length > 0) {
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: prayerTimesResponse.data
        });
      } else {
        return res.status(404).json({
          status: 'error',
          message: 'Belirtilen tarih aralığında namaz vakti verisi bulunamadı'
        });
      }
    })
    .catch(error => {
      return res.status(500).json({
        status: 'error',
        message: 'Namaz vakitleri alınırken bir hata oluştu: ' + error.message
      });
    });
});

app.get('/api/prayer_times/daterange/:cityId', (req, res) => {
  // Aynı işlemi yap
  const { cityId } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!cityId || !startDate || !endDate) {
    return res.status(400).json({
      status: 'error',
      message: 'İlçe ID, başlangıç tarihi ve bitiş tarihi parametreleri gerekli'
    });
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({
      status: 'error',
      message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı'
    });
  }
  
  const diyanetApi = require('./utils/diyanetApi');
  
  diyanetApi.getPrayerTimesByDateRangeAndCity(cityId, startDate, endDate)
    .then(prayerTimesResponse => {
      if (prayerTimesResponse?.success && prayerTimesResponse?.data?.length > 0) {
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: prayerTimesResponse.data
        });
      } else {
        return res.status(404).json({
          status: 'error',
          message: 'Belirtilen tarih aralığında namaz vakti verisi bulunamadı'
        });
      }
    })
    .catch(error => {
      return res.status(500).json({
        status: 'error',
        message: 'Namaz vakitleri alınırken bir hata oluştu: ' + error.message
      });
    });
});

// 5. KONUM ENDPOINTLERİ (ÜLKE-ŞEHİR-İLÇE) 
console.log('Konum endpointleri tanımlanıyor');
app.use('/api/countries', countryRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);

// 6. ANA SAYFA
app.get('/', (req, res) => {
  console.log('Ana sayfa isteği alındı');
  res.json({ 
    status: 'success', 
    message: 'Namaz Vakti API çalışıyor',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    endpoints: {
      // Tekil tarih sorguları
      prayers: '/api/prayers/:cityId/:date',
      prayer_times: '/api/prayer_times/:cityId/:date',
      // Tarih aralığı sorguları - Query Parametreleriyle
      prayerRangeQuery: '/api/prayers/daterange?cityId=CODE&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      prayer_timesRangeQuery: '/api/prayer_times/daterange?cityId=CODE&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      // Tarih aralığı sorguları - Path Parametresiyle
      prayerRangePath: '/api/prayers/daterange/:cityId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      prayer_timesRangePath: '/api/prayer_times/daterange/:cityId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
      // Konum endpointleri
      countries: '/api/countries',
      states: '/api/states',
      statesByCountry: '/api/states?countryId=:countryId',
      cities: '/api/cities',
      citiesByState: '/api/cities?stateId=:stateId'
    }
  });
});

// API Durum kontrolü rotası - basit bir 200 OK yanıt döner
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API çalışıyor',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Geçici olarak tablo yapısını kontrol etmek için endpoint
app.get('/api/check-prayer-times-table', tempController.checkPrayerTimesTable);

// Debug endpoint'leri
app.get('/api/debug/check-schema', async (req, res) => {
  try {
    console.log('Şema kontrol isteği alındı');
    const result = await checkAndCreateSchema();
    res.json({
      status: 'success',
      message: 'Şema kontrolü tamamlandı',
      result
    });
  } catch (error) {
    console.error('Şema kontrolü hatası:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Tüm tabloları listeleme
app.get('/api/debug/list-tables', async (req, res) => {
  try {
    console.log('Tablo listeleme isteği alındı');
    
    const query = `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;
    const result = await execute(query);
    
    res.json({
      status: 'success',
      tables: result.rows.map(row => row.name)
    });
  } catch (error) {
    console.error('Tablo listeleme hatası:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Veritabanı şeması inceleme endpoint'i
app.get('/api/db-schema', async (req, res) => {
  console.log('Veritabanı şema inceleme isteği alındı');
  try {
    const tableName = req.query.table;
    
    if (!tableName) {
      return res.status(400).json({
        status: 'error',
        message: 'Tablo adı belirtilmedi. Kullanım: /api/db-schema?table=table_name'
      });
    }
    
    const schemaInfo = await inspectTableSchema(tableName);
    res.json({
      status: schemaInfo.success ? 'success' : 'error',
      table: tableName,
      schema: schemaInfo
    });
  } catch (error) {
    console.error('Veritabanı şema inceleme hatası:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Veritabanı şema inceleme başarısız: ' + error.message
    });
  }
});

// Doğrudan SQL sorgusu yürütme endpointi (DEBUG/TEST amaçlı)
app.get('/api/run-sql', async (req, res) => {
  console.log('SQL sorgusu yürütme isteği alındı');
  try {
    const { sql, params } = req.query;
    
    if (!sql) {
      return res.status(400).json({
        status: 'error',
        message: 'SQL sorgusu belirtilmedi. Kullanım: /api/run-sql?sql=SELECT * FROM table_name'
      });
    }
    
    console.log(`TEST SQL sorgusu yürütülüyor: ${sql}`);
    console.log(`TEST SQL parametreleri:`, params ? JSON.parse(params) : []);
    
    const result = await execute(sql, params ? JSON.parse(params) : []);
    res.json({
      status: 'success',
      sql: sql,
      params: params ? JSON.parse(params) : [],
      result: {
        rows: result.rows,
        rowCount: result.rows?.length || 0
      }
    });
  } catch (error) {
    console.error('SQL sorgusu yürütme hatası:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'SQL sorgusu yürütme başarısız: ' + error.message,
      sql: req.query.sql,
      params: req.query.params
    });
  }
});

// Doğrudan veritabanından namaz vakti kontrolü (DEBUG/TEST amaçlı)
app.get('/api/debug-prayer/:cityId/:date', async (req, res) => {
  console.log('DEBUG namaz vakti isteği alındı');
  try {
    const { cityId, date } = req.params;
    
    // 1. Önce prayer_times tablosundaki tüm kayıtları kontrol et
    const allPrayerTimes = await execute(`SELECT COUNT(*) as count FROM prayer_times`);
    console.log(`DEBUG - Toplam namaz vakti kayıt sayısı:`, allPrayerTimes.rows[0].count);
    
    // 2. Bu tarih için namaz vakti var mı doğrudan kontrol et
    const directQuery = `SELECT * FROM prayer_times WHERE date = ?`;
    console.log(`DEBUG - Tarih sorgusu: ${directQuery} [${date}]`);
    const directResult = await execute(directQuery, [date]);
    
    // 3. İlçe bilgisini kontrol et
    const cityQuery = `SELECT * FROM cities WHERE id = ? OR code = ?`;
    console.log(`DEBUG - İlçe sorgusu: ${cityQuery} [${cityId}, ${cityId}]`);
    const cityResult = await execute(cityQuery, [cityId, cityId]);
    
    // 4. JOIN sorgusu ile her iki tabloyu da kontrol et
    const joinQuery = `
      SELECT 
        pt.*, 
        c.id as city_db_id, 
        c.code as city_code,
        c.name as city_name
      FROM 
        prayer_times pt
      LEFT JOIN 
        cities c ON pt.city_id = c.id
      WHERE 
        (pt.city_id = ? OR c.code = ?) AND 
        pt.date = ?
    `;
    console.log(`DEBUG - JOIN sorgusu: ${joinQuery} [${cityId}, ${cityId}, ${date}]`);
    const joinResult = await execute(joinQuery, [cityId, cityId, date]);
    
    // 5. Tüm DEBUG bilgilerini yanıtta döndür
    res.json({
      status: 'debug_success',
      params: {
        cityId: cityId,
        date: date,
        isNumericCityId: /^\d+$/.test(cityId.toString())
      },
      totalRecords: allPrayerTimes.rows[0].count,
      dateSearch: {
        query: directQuery,
        params: [date],
        found: directResult.rows.length > 0,
        count: directResult.rows.length,
        records: directResult.rows.slice(0, 2) // İlk 2 kayıt
      },
      citySearch: {
        query: cityQuery,
        params: [cityId, cityId],
        found: cityResult.rows.length > 0,
        cityInfo: cityResult.rows[0]
      },
      joinSearch: {
        query: joinQuery,
        params: [cityId, cityId, date],
        found: joinResult.rows.length > 0,
        count: joinResult.rows.length,
        records: joinResult.rows
      }
    });
  } catch (error) {
    console.error('DEBUG namaz vakti sorgu hatası:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'DEBUG namaz vakti sorgusu başarısız: ' + error.message
    });
  }
});

// Veritabanı şema kontrolü endpoint'i
app.get('/api/database-check', async (req, res) => {
  console.log('Veritabanı kontrolü isteği alındı');
  try {
    // Önce bağlantıyı test et
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({
        status: 'error',
        message: 'Veritabanı bağlantısı başarısız',
        time: new Date().toISOString()
      });
    }
    
    // Tablo listesini kontrol et
    const tables = await execute("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.rows.map(row => row.name);
    
    // Her tablonun satır sayısını kontrol et
    const tableCounts = {};
    for (const table of tableNames) {
      if (table.startsWith('sqlite_')) continue; // SQLite sistem tablolarını atla
      const countResult = await execute(`SELECT COUNT(*) as count FROM ${table}`);
      tableCounts[table] = countResult.rows[0].count;
    }
    
    // Tablolar arası ilişkileri kontrol et
    let relationshipStatus = {};
    
    if (tableNames.includes('countries') && tableNames.includes('states')) {
      const countryStateJoin = await execute(`
        SELECT COUNT(*) as count 
        FROM states s
        LEFT JOIN countries c ON s.country_id = c.id
      `);
      relationshipStatus['countries_states'] = {
        count: countryStateJoin.rows[0].count,
        valid: true
      };
    }
    
    if (tableNames.includes('states') && tableNames.includes('cities')) {
      const stateCityJoin = await execute(`
        SELECT COUNT(*) as count 
        FROM cities c
        LEFT JOIN states s ON c.state_id = s.id
      `);
      relationshipStatus['states_cities'] = {
        count: stateCityJoin.rows[0].count,
        valid: true
      };
    }
    
    if (tableNames.includes('cities') && tableNames.includes('prayer_times')) {
      const cityPrayerJoin = await execute(`
        SELECT COUNT(*) as count 
        FROM prayer_times pt
        LEFT JOIN cities c ON pt.city_id = c.id
      `);
      relationshipStatus['cities_prayer_times'] = {
        count: cityPrayerJoin.rows[0].count,
        valid: true
      };
    }
    
    // Sonuçları döndür
    res.json({
      status: 'success',
      database: {
        connected: isConnected,
        tables: tableNames,
        tableCounts: tableCounts
      },
      relationships: relationshipStatus,
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Veritabanı kontrolü hatası:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Veritabanı kontrolü başarısız: ' + error.message,
      error: error.stack,
      time: new Date().toISOString()
    });
  }
});

// Basit test verisi ekleme endpoint'i
app.get('/api/test-data', async (req, res) => {
  console.log('Test verisi ekleme isteği alındı');
  try {
    // Test verisi eklenip eklenmeyeceğini kontrol et
    const shouldAdd = req.query.add === 'true';
    if (!shouldAdd) {
      return res.status(400).json({
        status: 'error',
        message: 'Test verisi eklemek için ?add=true parametresi gerekli'
      });
    }
    
    // Türkiye'yi ekle
    const turkeyResult = await execute(
      'INSERT INTO countries (code, name) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET name = ? RETURNING *',
      ['TR', 'Türkiye', 'Türkiye']
    );
    const turkeyId = turkeyResult.rows[0].id;
    
    // İstanbul'u ekle
    const istanbulResult = await execute(
      'INSERT INTO states (code, country_id, name) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET name = ? RETURNING *',
      ['34', turkeyId, 'İstanbul', 'İstanbul']
    );
    const istanbulId = istanbulResult.rows[0].id;
    
    // Kadıköy'ü ekle
    const kadikoyResult = await execute(
      'INSERT INTO cities (code, state_id, name) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET name = ? RETURNING *',
      ['9541', istanbulId, 'Kadıköy', 'Kadıköy']
    );
    
    // Bugünün namaz vakti verisi
    const today = new Date().toISOString().split('T')[0];
    const prayerResult = await execute(
      `INSERT INTO prayer_times 
       (city_id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, gregorian_date, hijri_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON CONFLICT(city_id, date) DO UPDATE SET 
       fajr = ?, sunrise = ?, dhuhr = ?, asr = ?, maghrib = ?, isha = ?
       RETURNING *`,
      [
        kadikoyResult.rows[0].id, today, '05:30', '07:00', '12:30', '15:00', '17:30', '19:00', today, '1445-05-15',
        '05:30', '07:00', '12:30', '15:00', '17:30', '19:00'
      ]
    );
    
    res.json({
      status: 'success',
      message: 'Test verisi başarıyla eklendi',
      data: {
        country: turkeyResult.rows[0],
        state: istanbulResult.rows[0],
        city: kadikoyResult.rows[0],
        prayerTime: prayerResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Test verisi ekleme hatası:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Test verisi eklenirken hata oluştu: ' + error.message,
      error: error.stack
    });
  }
});

// Hata işleyici
app.use((err, req, res, next) => {
  console.error('API Hatası:', err.message);
  res.status(500).json({ error: 'Sunucu hatası', message: err.message });
});

// Sunucuyu başlat
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu başarıyla başlatıldı! 🚀`);
  console.log(`PORT: ${PORT}`);
  console.log(`Ortam: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://0.0.0.0:${PORT}`);
  
  // Veritabanı bağlantısını test et
  testConnection()
    .then(isConnected => {
      console.log(`Veritabanı bağlantısı: ${isConnected ? 'Başarılı' : 'Başarısız'}`);
      
      // Veritabanı bağlantısı başarılıysa zamanlanmış görevleri başlat
      if (isConnected) {
        // Veritabanı şemasını kontrol et ve eksik tablolar varsa oluştur
        checkAndCreateSchema()
          .then(schemaResult => {
            console.log('Şema kontrolü sonucu:', schemaResult.message);
            
            // Zamanlanmış görevleri başlat
            try {
              scheduleMonthlyCleanup();
              console.log('Aylık temizleme görevi zamanlandı');
            } catch (error) {
              console.error('Zamanlanmış görevleri başlatırken hata:', error.message);
            }
          })
          .catch(schemaError => {
            console.error('Şema kontrolü hatası:', schemaError.message);
          });
      }
    })
    .catch(error => {
      console.error('Veritabanı bağlantı testi hatası:', error.message);
    });
});

// Hata yakalama
server.on('error', (error) => {
  console.error('Sunucu başlatma hatası:', error.message);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} zaten kullanımda! Farklı bir port seçin.`);
  }
  
  // Kritik hatada uygulamayı sonlandır
  process.exit(1);
});

// Sinyalleri yakala
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

// Yakalanmayan hataları logla
process.on('uncaughtException', (error) => {
  console.error('Yakalanmayan hata:', error.message);
  console.error(error.stack);
  
  // Cloud Run'da hata detaylarını zenginleştir
  if (process.env.NODE_ENV === 'production') {
    console.error('Hata zamanı:', new Date().toISOString());
    console.error('Process uptime:', process.uptime());
    console.error('Bellek kullanımı:', process.memoryUsage());
    console.error('Ortam bilgileri:', {
      node_env: process.env.NODE_ENV,
      node_version: process.version,
      platform: process.platform,
      pid: process.pid,
      port: process.env.PORT,
    });
  }
  
  // 30 saniye süre tanı ve kapat
  setTimeout(() => process.exit(1), 30000);
});

// Promise rejection hatalarını yakala
process.on('unhandledRejection', (reason, promise) => {
  console.error('Yakalanmayan Promise reddi:', reason);
  
  // Cloud Run'da hata detaylarını zenginleştir
  if (process.env.NODE_ENV === 'production') {
    console.error('Hata zamanı:', new Date().toISOString());
    console.error('Process uptime:', process.uptime());
  }
  
  // Uygulamayı çökertme, sadece logla
  // Bu tür hataların istekleri etkilememesi için
}); 