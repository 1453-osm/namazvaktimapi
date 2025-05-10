const { Pool } = require('pg');
require('dotenv').config();

// Veritabanı bağlantısı için daha temel bir yaklaşım kullanacağız
console.log('Veritabanı yazma testi başlıyor...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL tanımlı mı:', !!process.env.DATABASE_URL);

// Bağlantı bilgilerini açıkça belirtelim
const connectionConfig = {
  user: 'namazvaktimdb_owner',
  password: 'npg_7iuFLUEXv6Cs',
  host: 'ep-proud-lab-a4dbdbma-pooler.us-east-1.aws.neon.tech',
  database: 'namazvaktimdb',
  ssl: { rejectUnauthorized: false },
  port: 5432
};

console.log('Bağlantı yapılandırması:', JSON.stringify({
  user: connectionConfig.user,
  host: connectionConfig.host,
  database: connectionConfig.database,
  port: connectionConfig.port,
  ssl: !!connectionConfig.ssl
}, null, 2));

// Doğrudan bağlantı bilgilerini kullanarak pool oluştur
const pool = new Pool(connectionConfig);

async function testDbConnection() {
  // Ayrı bir client oluştur
  const client = await pool.connect();
  console.log('Veritabanı bağlantısı yapıldı!');
  
  try {
    // 1. Basit SELECT sorgusu
    console.log('Basit SELECT sorgusu çalıştırılıyor...');
    const timeResult = await client.query('SELECT NOW() as time');
    console.log('Sunucu zamanı:', timeResult.rows[0].time);
    
    // 2. Mevcut tabloları listele
    console.log('\nMevcut tabloları listeleme...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tablolar:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // 3. prayer_times tablosu yapısını kontrol et
    console.log('\nprayer_times tablosu yapısını kontrol etme...');
    const tableStructureResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'prayer_times'
      ORDER BY ordinal_position;
    `);
    
    console.log('prayer_times tablosu yapısı:');
    tableStructureResult.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type}, ${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // 4. Basit INSERT testi
    console.log('\nBasit INSERT testi yapılıyor...');
    
    // Önce test verilerinin var olup olmadığını kontrol et
    const checkTestData = await client.query(`
      SELECT COUNT(*) FROM prayer_times 
      WHERE city_id = 999999 AND prayer_date = '2023-01-01'
    `);
    
    // Eğer test verileri zaten varsa, önce silelim
    if (parseInt(checkTestData.rows[0].count) > 0) {
      console.log('Eski test verileri siliniyor...');
      await client.query(`
        DELETE FROM prayer_times 
        WHERE city_id = 999999 AND prayer_date = '2023-01-01'
      `);
    }
    
    // Transaction başlat
    await client.query('BEGIN');
    
    // Test verilerini ekle
    const insertResult = await client.query(`
      INSERT INTO prayer_times (
        city_id, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha
      ) VALUES (
        999999, '2023-01-01', '05:30', '07:15', '12:30', '15:45', '18:00', '19:30'
      ) RETURNING id;
    `);
    
    console.log('INSERT sonucu:', insertResult.rows[0]);
    
    // İşlemi onayla
    await client.query('COMMIT');
    console.log('Transaction başarıyla tamamlandı.');
    
    // Eklenen veriyi kontrol et
    const verifyResult = await client.query(`
      SELECT * FROM prayer_times 
      WHERE city_id = 999999 AND prayer_date = '2023-01-01'
    `);
    
    console.log('\nEklenen veri:', verifyResult.rows[0]);
    
    // Temizlik: Test verilerini sil
    console.log('\nTemizlik: Test verilerini silme...');
    await client.query(`
      DELETE FROM prayer_times 
      WHERE city_id = 999999 AND prayer_date = '2023-01-01'
    `);
    
    console.log('Test verileri silindi.');
    
  } catch (error) {
    console.error('HATA!', error.message);
    console.error('Tam hata:', error);
    
    // Hata durumunda rollback
    try {
      await client.query('ROLLBACK');
      console.log('Transaction geri alındı.');
    } catch (rollbackError) {
      console.error('Rollback hatası:', rollbackError.message);
    }
  } finally {
    // Bağlantıyı kapat
    client.release();
    await pool.end();
    console.log('Veritabanı bağlantısı kapatıldı.');
  }
}

// Testi çalıştır
console.log('Veritabanı yazma testi başlatılıyor...');
testDbConnection()
  .then(() => console.log('Test tamamlandı.'))
  .catch(err => console.error('Test sırasında beklenmeyen hata:', err)); 